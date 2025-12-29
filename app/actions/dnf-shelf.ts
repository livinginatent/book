"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { Book, ReadingStatus, UserBook } from "@/types/database.types";

export interface DNFBook extends Book {
  userBook: UserBook;
  pages_saved: number; // page_count - pages_read from reading_progress
  notes: string | null; // Reason for DNF
  date_added: string; // When book was added to reading list
  updated_at: string; // When status was changed to DNF (shows how long they tried)
  days_before_quitting: number | null; // Days from date_added to updated_at
}

export interface DNFBooksResult {
  success: true;
  books: DNFBook[];
  total: number;
}

export interface DNFBooksError {
  success: false;
  error: string;
}

/**
 * Get DNF (Did Not Finish) books for the authenticated user
 * Calculates pages_saved and includes notes as reason for DNF
 * Shows date_added vs updated_at to indicate how long the user tried before quitting
 */
export async function getDNFBooks(): Promise<DNFBooksResult | DNFBooksError> {
  const timer = createTimer("getDNFBooks");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getDNFBooks.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Get user's DNF books
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "dnf" as ReadingStatus)
      .order("updated_at", { ascending: false });

    if (userBooksError) {
      console.error("Error fetching user_books:", userBooksError);
      timer.end();
      return { success: false, error: "Failed to fetch DNF books" };
    }

    if (!userBooks || userBooks.length === 0) {
      timer.end();
      return { success: true, books: [], total: 0 };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel fetch of books and reading progress
    const queryTimer = createTimer("getDNFBooks.queries");
    const [booksResult, progressResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("book_id, pages_read")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
    ]);
    queryTimer.end();

    if (booksResult.error) {
      console.error("Error fetching books:", booksResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch books" };
    }

    // Create progress map for quick lookup
    const progressMap: Record<string, number> = {};
    for (const progress of progressResult.data || []) {
      progressMap[progress.book_id] = progress.pages_read;
    }

    // Build result with calculated pages_saved and days_before_quitting
    const dnfBooks: DNFBook[] = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;

        const pagesRead = progressMap[ub.book_id] || 0;
        const pageCount = book.page_count || 0;
        const pagesSaved = Math.max(0, pageCount - pagesRead);

        // Calculate days from date_added to updated_at
        let daysBeforeQuitting: number | null = null;
        if (ub.date_added && ub.updated_at) {
          const startDate = new Date(ub.date_added);
          const endDate = new Date(ub.updated_at);
          const diffTime = endDate.getTime() - startDate.getTime();
          daysBeforeQuitting = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          ...book,
          userBook: ub,
          pages_saved: pagesSaved,
          notes: ub.notes,
          date_added: ub.date_added,
          updated_at: ub.updated_at,
          days_before_quitting: daysBeforeQuitting,
        };
      })
      .filter((book): book is DNFBook => book !== undefined);

    timer.end();
    return {
      success: true,
      books: dnfBooks,
      total: dnfBooks.length,
    };
  } catch (error) {
    timer.end();
    console.error("Get DNF books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

