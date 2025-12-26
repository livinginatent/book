"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { ReadingStatus, Shelf } from "@/types/database.types";

export type ShelfType = "default" | "custom";

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
      supabase
        .from("user_books")
        .select("status")
        .eq("user_id", user.id),
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Shelf name is required" };
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
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
