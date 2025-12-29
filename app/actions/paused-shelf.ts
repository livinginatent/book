"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { Book, UserBook } from "@/types/database.types";

export interface PausedBook extends Book {
  userBook: UserBook;
  page_count: number | null;
  pages_read: number;
  days_since_last_read: number | null;
  latest_journal_entry: string | null;
}

export interface PausedBooksResult {
  success: true;
  books: PausedBook[];
  total: number;
}

export interface PausedBooksError {
  success: false;
  error: string;
}

/**
 * Get paused books for the authenticated user
 * Includes latest journal entry and days since last read
 */
export async function getPausedBooks(): Promise<
  PausedBooksResult | PausedBooksError
> {
  const timer = createTimer("getPausedBooks");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getPausedBooks.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Get user's paused books
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "paused")
      .order("updated_at", { ascending: false });

    if (userBooksError) {
      console.error("Error fetching user_books:", userBooksError);
      timer.end();
      return { success: false, error: "Failed to fetch paused books" };
    }

    if (!userBooks || userBooks.length === 0) {
      timer.end();
      return { success: true, books: [], total: 0 };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel fetch of books, reading progress, and journal entries
    const queryTimer = createTimer("getPausedBooks.queries");
    const [booksResult, progressResult, journalResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("book_id, pages_read")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
      supabase
        .from("reading_journal")
        .select("book_id, content, created_at")
        .eq("user_id", user.id)
        .in("book_id", bookIds)
        .order("created_at", { ascending: false }),
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

    // Create journal map with latest entry per book
    const journalMap: Record<string, string> = {};
    const processedBooks = new Set<string>();
    for (const entry of journalResult.data || []) {
      if (!processedBooks.has(entry.book_id)) {
        journalMap[entry.book_id] = entry.content;
        processedBooks.add(entry.book_id);
      }
    }

    // Build result with calculated days_since_last_read
    const pausedBooks: PausedBook[] = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;

        const pagesRead = progressMap[ub.book_id] || 0;
        const latestJournalEntry = journalMap[ub.book_id] || null;

        // Calculate days since last read using updated_at from user_books
        let daysSinceLastRead: number | null = null;
        if (ub.updated_at) {
          const lastReadDate = new Date(ub.updated_at);
          const now = new Date();
          const diffTime = now.getTime() - lastReadDate.getTime();
          daysSinceLastRead = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          ...book,
          userBook: ub,
          page_count: book.page_count,
          pages_read: pagesRead,
          days_since_last_read: daysSinceLastRead,
          latest_journal_entry: latestJournalEntry,
        };
      })
      .filter((book): book is PausedBook => book !== undefined);

    timer.end();
    return {
      success: true,
      books: pausedBooks,
      total: pausedBooks.length,
    };
  } catch (error) {
    timer.end();
    console.error("Get paused books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

