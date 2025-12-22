"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
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
 */
export async function getShelves(): Promise<ShelvesResult | ShelvesError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: shelves, error: shelvesError } = await supabase
      .from("shelves")
      .select("*")
      .eq("user_id", user.id)
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (shelvesError) {
      console.error("Error fetching shelves:", shelvesError);
      return { success: false, error: "Failed to fetch shelves" };
    }

    // Get counts for default shelves based on user_books.status
    const countMap: Record<ReadingStatus, number> = {
      want_to_read: 0,
      currently_reading: 0,
      finished: 0,
      dnf: 0,
      up_next: 0,
      paused: 0
    };

    // Fetch all user_books for the user and count in memory
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("status")
      .eq("user_id", user.id);

    if (userBooksError) {
      console.error(
        "Error fetching user_books for shelf counts:",
        userBooksError
      );
    } else {
      for (const row of userBooks || []) {
        const status = row.status as ReadingStatus;
        if (status in countMap) {
          countMap[status] += 1;
        }
      }
    }

    const defaultShelves: ShelfWithCount[] = [];
    const customShelves: ShelfWithCount[] = [];

    for (const shelf of shelves || []) {
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

    return {
      success: true,
      defaultShelves,
      customShelves,
    };
  } catch (error) {
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
