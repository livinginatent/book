"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
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
 * Optimized with parallel queries
 */
export async function getCurrentlyReadingBooks(): Promise<
  CurrentlyReadingResult | CurrentlyReadingError
> {
  const timer = createTimer("getCurrentlyReadingBooks");
  
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getCurrentlyReadingBooks.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Get user's currently reading books
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "currently_reading")
      .order("date_added", { ascending: false });

    if (userBooksError) {
      console.error("Error fetching user_books:", userBooksError);
      timer.end();
      return { success: false, error: "Failed to fetch reading list" };
    }

    if (!userBooks || userBooks.length === 0) {
      timer.end();
      return { success: true, books: [], total: 0 };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel fetch of books and progress
    const queryTimer = createTimer("getCurrentlyReadingBooks.queries");
    const [booksResult, progressResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
    ]);
    queryTimer.end();

    if (booksResult.error) {
      console.error("Error fetching books:", booksResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch books" };
    }

    // Create progress map
    const progressMap: Record<string, ReadingProgress> = {};
    for (const progress of progressResult.data || []) {
      progressMap[progress.book_id] = progress;
    }

    // Build ordered result
    const orderedBooks: BookWithProgress[] = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;
        return {
          ...book,
          progress: progressMap[ub.book_id],
          userBook: ub,
        };
      })
      .filter((book): book is BookWithProgress => book !== undefined);

    timer.end();
    return {
      success: true,
      books: orderedBooks,
      total: orderedBooks.length,
    };
  } catch (error) {
    timer.end();
    console.error("Get currently reading books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
