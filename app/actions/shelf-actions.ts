"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { ReadingStatus, Shelf } from "@/types/database.types";

export type ShelfType = "default" | "custom";

const FREE_SHELF_LIMIT = 3;
const PREMIUM_SHELF_LIMIT = 12;

export interface ShelfWithCount extends Shelf {
  book_count: number;
}

export interface ShelvesResult {
  success: true;
  defaultShelves: ShelfWithCount[];
  customShelves: ShelfWithCount[];
}

export interface ShelvesError {
  success: false;
  error: string;
}

async function getUserShelfLimit(userId: string): Promise<number> {
  const supabase = await createClient(cookies());

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching subscription tier:", error);
    return FREE_SHELF_LIMIT;
  }

  const tier = data?.subscription_tier;

  if (tier === "premium" || tier === "bibliophile") return PREMIUM_SHELF_LIMIT;

  return FREE_SHELF_LIMIT;
}

/**
 * Get shelves for the authenticated user, including book counts
 * Optimized with parallel queries
 */
export async function getShelves(): Promise<ShelvesResult | ShelvesError> {
  const timer = createTimer("getShelves");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getShelves.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Parallel queries for shelves and user_books
    const queryTimer = createTimer("getShelves.queries");
    const [shelvesResult, userBooksResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("user_books").select("status").eq("user_id", user.id),
    ]);
    queryTimer.end();

    if (shelvesResult.error) {
      console.error("Error fetching shelves:", shelvesResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch shelves" };
    }

    // Count statuses in memory
    const countMap: Record<ReadingStatus, number> = {
      want_to_read: 0,
      currently_reading: 0,
      finished: 0,
      dnf: 0,
      up_next: 0,
      paused: 0,
    };

    if (!userBooksResult.error) {
      for (const row of userBooksResult.data || []) {
        const status = row.status as ReadingStatus;
        if (status in countMap) {
          countMap[status] += 1;
        }
      }
    }

    const defaultShelves: ShelfWithCount[] = [];
    const customShelves: ShelfWithCount[] = [];

    for (const shelf of shelvesResult.data || []) {
      const base: ShelfWithCount = {
        ...shelf,
        book_count:
          shelf.type === "default" && shelf.status
            ? countMap[shelf.status as ReadingStatus] ?? 0
            : 0,
      };

      if (shelf.type === "default") {
        defaultShelves.push(base);
      } else {
        customShelves.push(base);
      }
    }

    timer.end();
    return {
      success: true,
      defaultShelves,
      customShelves,
    };
  } catch (error) {
    timer.end();
    console.error("Get shelves error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create a custom shelf for the authenticated user
 */
export async function createCustomShelf(
  name: string
): Promise<
  { success: true; shelf: ShelfWithCount } | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Shelf name is required" };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { count: customShelfCount, error: countError } = await supabase
      .from("shelves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "custom");

    if (countError) {
      console.error("Error counting custom shelves:", countError);
      return { success: false, error: "Failed to create shelf" };
    }

    const limit = await getUserShelfLimit(user.id);

    if ((customShelfCount ?? 0) >= limit) {
      return {
        success: false,
        error:
          "Limit reached. Upgrade to Bibliophile for unlimited private shelves.",
      };
    }

    const { data, error: insertError } = await supabase
      .from("shelves")
      .insert({
        user_id: user.id,
        name: trimmedName,
        type: "custom",
      })
      .select()
      .single();

    if (insertError || !data) {
      console.error("Error creating custom shelf:", insertError);
      return { success: false, error: "Failed to create shelf" };
    }

    return {
      success: true,
      shelf: {
        ...data,
        book_count: 0,
      },
    };
  } catch (error) {
    console.error("Create custom shelf error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
