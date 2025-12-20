"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { ReadingProgress } from "@/types/database.types";

export interface ProgressUpdateResult {
  success: true;
  progress: ReadingProgress;
  message: string;
}

export interface ProgressError {
  success: false;
  error: string;
}

/**
 * Update reading progress for a book (upsert - creates if doesn't exist)
 */
export async function updateReadingProgress(
  bookId: string,
  pagesRead: number
): Promise<ProgressUpdateResult | ProgressError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Upsert reading progress
    const { data: progress, error: upsertError } = await supabase
      .from("reading_progress")
      .upsert(
        {
          user_id: user.id,
          book_id: bookId,
          pages_read: Math.max(0, pagesRead),
        },
        {
          onConflict: "user_id,book_id",
        }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Error updating reading progress:", upsertError);
      return { success: false, error: "Failed to update reading progress" };
    }

    return {
      success: true,
      progress,
      message: "Reading progress updated",
    };
  } catch (error) {
    console.error("Update reading progress error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get reading progress for a specific book
 */
export async function getReadingProgress(
  bookId: string
): Promise<{ success: true; progress: ReadingProgress | null } | ProgressError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: progress, error } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (which is fine)
      console.error("Error fetching reading progress:", error);
      return { success: false, error: "Failed to fetch reading progress" };
    }

    return { success: true, progress: progress || null };
  } catch (error) {
    console.error("Get reading progress error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get reading progress for multiple books
 */
export async function getMultipleReadingProgress(
  bookIds: string[]
): Promise<
  { success: true; progressMap: Record<string, ReadingProgress> } | ProgressError
> {
  try {
    if (bookIds.length === 0) {
      return { success: true, progressMap: {} };
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: progressList, error } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("book_id", bookIds);

    if (error) {
      console.error("Error fetching reading progress:", error);
      return { success: false, error: "Failed to fetch reading progress" };
    }

    // Convert to a map for easy lookup
    const progressMap: Record<string, ReadingProgress> = {};
    for (const progress of progressList || []) {
      progressMap[progress.book_id] = progress;
    }

    return { success: true, progressMap };
  } catch (error) {
    console.error("Get multiple reading progress error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete reading progress for a book
 */
export async function deleteReadingProgress(
  bookId: string
): Promise<{ success: true; message: string } | ProgressError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { error } = await supabase
      .from("reading_progress")
      .delete()
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (error) {
      console.error("Error deleting reading progress:", error);
      return { success: false, error: "Failed to delete reading progress" };
    }

    return { success: true, message: "Reading progress deleted" };
  } catch (error) {
    console.error("Delete reading progress error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

