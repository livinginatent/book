"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { Book, UserBook } from "@/types/database.types";

export interface FinishedBook extends Book {
  userBook: UserBook;
  totalReadingTimeDays: number | null; // Days from first session to date_finished
  status: "finished"; // Flatten status to top level
  date_added: string; // Also flatten date_added for consistency
  date_finished: string | null;
}

export interface FinishedBooksResult {
  success: true;
  books: FinishedBook[];
  total: number;
}

export interface FinishedBooksError {
  success: false;
  error: string;
}

/**
 * Get finished books for the authenticated user
 * @param year - Optional year to filter results (e.g., 2024)
 * @returns List of finished books sorted by date_finished descending
 */
export async function getFinishedBooks(
  year?: number
): Promise<FinishedBooksResult | FinishedBooksError> {
  const timer = createTimer("getFinishedBooks");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getFinishedBooks.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Build query for finished user_books
    let userBooksQuery = supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "finished")
      .not("date_finished", "is", null);

    // Apply year filter if provided
    if (year) {
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;
      userBooksQuery = userBooksQuery
        .gte("date_finished", yearStart)
        .lte("date_finished", yearEnd);
    }

    // Fetch finished user_books
    const { data: userBooks, error: userBooksError } =
      await userBooksQuery.order("date_finished", { ascending: false });

    if (userBooksError) {
      console.error("Error fetching finished user_books:", userBooksError);
      timer.end();
      return { success: false, error: "Failed to fetch finished books" };
    }

    if (!userBooks || userBooks.length === 0) {
      timer.end();
      return { success: true, books: [], total: 0 };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel fetch of books and reading sessions
    const queryTimer = createTimer("getFinishedBooks.queries");
    const [booksResult, sessionsResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_sessions")
        .select("book_id, session_date")
        .eq("user_id", user.id)
        .in("book_id", bookIds)
        .order("session_date", { ascending: true }),
    ]);
    queryTimer.end();

    if (booksResult.error) {
      console.error("Error fetching books:", booksResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch books" };
    }

    // Group sessions by book_id to find first session date for each book
    const firstSessionByBook: Record<string, string> = {};
    for (const session of sessionsResult.data || []) {
      if (!firstSessionByBook[session.book_id]) {
        firstSessionByBook[session.book_id] = session.session_date;
      }
    }

    // Build result with calculated reading time
    const finishedBooks: FinishedBook[] = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;

        // Calculate total reading time (days from first session to date_finished)
        let totalReadingTimeDays: number | null = null;
        if (ub.date_finished) {
          const firstSessionDate = firstSessionByBook[ub.book_id];
          if (firstSessionDate) {
            const startDate = new Date(firstSessionDate);
            const endDate = new Date(ub.date_finished);
            const diffTime = endDate.getTime() - startDate.getTime();
            totalReadingTimeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          }
        }

        return {
          ...book,
          userBook: ub,
          totalReadingTimeDays,
          // Flatten critical fields to top level for easier access
          status: ub.status as "finished",
          date_added: ub.date_added,
          date_finished: ub.date_finished,
        };
      })
      .filter((book): book is FinishedBook => book !== undefined);

    timer.end();
    return {
      success: true,
      books: finishedBooks,
      total: finishedBooks.length,
    };
  } catch (error) {
    timer.end();
    console.error("Get finished books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
