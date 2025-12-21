"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Book, ReadingProgress, UserBook } from "@/types/database.types";

export interface BookWithProgress extends Book {
  progress?: ReadingProgress;
  userBook?: UserBook;
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
 * Now reads from user_books table as the single source of truth
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

    // Get user's currently reading books from user_books table
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "currently_reading")
      .order("date_added", { ascending: false });

    if (userBooksError) {
      console.error("Error fetching user_books:", userBooksError);
      return { success: false, error: "Failed to fetch reading list" };
    }

    if (!userBooks || userBooks.length === 0) {
      return { success: true, books: [], total: 0 };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

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

    // Create maps for quick lookup
    const progressMap: Record<string, ReadingProgress> = {};
    for (const progress of progressList || []) {
      progressMap[progress.book_id] = progress;
    }

    const userBookMap: Record<string, UserBook> = {};
    for (const ub of userBooks) {
      userBookMap[ub.book_id] = ub;
    }

    // Build the result maintaining order from user_books
    const orderedBooks: BookWithProgress[] = userBooks
      .map((ub) => {
        const book = books?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;
        return {
          ...book,
          progress: progressMap[ub.book_id],
          userBook: ub,
        };
      })
      .filter((book): book is BookWithProgress => book !== undefined);

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
