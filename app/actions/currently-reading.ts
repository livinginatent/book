"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Book, ReadingProgress } from "@/types/database.types";

export interface BookWithProgress extends Book {
  progress?: ReadingProgress;
}

export interface CurrentlyReadingResult {
  success: true;
  books: BookWithProgress[];
  total: number;
}

export interface CurrentlyReadingError {
  success: false;
  error: string;
}

/**
 * Get currently reading books for the authenticated user with progress data
 */
export async function getCurrentlyReadingBooks(): Promise<
  CurrentlyReadingResult | CurrentlyReadingError
> {
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

    // Get user's profile with currently_reading array
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("currently_reading")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const bookIds = profile.currently_reading || [];

    if (bookIds.length === 0) {
      return { success: true, books: [], total: 0 };
    }

    // Fetch books by IDs
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("*")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch books" };
    }

    // Fetch reading progress for these books
    const { data: progressList, error: progressError } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .in("book_id", bookIds);

    if (progressError) {
      console.error("Error fetching reading progress:", progressError);
      // Continue without progress data
    }

    // Create a map of progress by book_id
    const progressMap: Record<string, ReadingProgress> = {};
    for (const progress of progressList || []) {
      progressMap[progress.book_id] = progress;
    }

    // Maintain the order from the profile array and attach progress
    const orderedBooks: BookWithProgress[] = bookIds
      .map((id: string) => {
        const book = books?.find((b) => b.id === id);
        if (!book) return undefined;
        return {
          ...book,
          progress: progressMap[id],
        };
      })
      .filter((book:any): book is BookWithProgress => book !== undefined);

    return {
      success: true,
      books: orderedBooks,
      total: orderedBooks.length,
    };
  } catch (error) {
    console.error("Get currently reading books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

