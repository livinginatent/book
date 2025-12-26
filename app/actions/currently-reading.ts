"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { Book, ReadingProgress, UserBook } from "@/types/database.types";

export interface BookWithProgress extends Book {
  progress?: ReadingProgress;
  userBook?: UserBook;
  lastReadDate?: Date | null;
  velocity?: number; // Average pages per day over last 7 days
  pages_left?: number; // page_count - current_progress
  date_added?: string; // Date when book was added to reading list
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

    // Calculate date 7 days ago for filtering
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoDate = sevenDaysAgo.toISOString().split("T")[0];

    // Parallel fetch of books, progress, and reading sessions data
    const queryTimer = createTimer("getCurrentlyReadingBooks.queries");
    const [
      booksResult,
      progressResult,
      allSessionsResult,
      recentSessionsResult,
    ] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
      // Get all sessions for last_read_at calculation
      supabase
        .from("reading_sessions")
        .select(
          "book_id, pages_read, last_read_at, ended_at, started_at, session_date"
        )
        .eq("user_id", user.id)
        .in("book_id", bookIds),
      // Get only last 7 days sessions for pages calculation
      supabase
        .from("reading_sessions")
        .select("book_id, pages_read, session_date")
        .eq("user_id", user.id)
        .in("book_id", bookIds)
        .gte("session_date", sevenDaysAgoDate),
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

    // Process reading sessions data
    const sessionDataMap: Record<
      string,
      {
        lastReadAt: Date | null;
        pagesLast7Days: number;
        velocity: number;
      }
    > = {};

    // Group all sessions by book_id for last_read_at calculation
    type SessionType = NonNullable<typeof allSessionsResult.data>[number];
    const allSessionsByBook: Record<string, SessionType[]> = {};
    for (const session of allSessionsResult.data || []) {
      if (!allSessionsByBook[session.book_id]) {
        allSessionsByBook[session.book_id] = [];
      }
      allSessionsByBook[session.book_id]!.push(session);
    }

    // Group recent sessions (last 7 days) by book_id for pages calculation
    type RecentSessionType = NonNullable<
      typeof recentSessionsResult.data
    >[number];
    const recentSessionsByBook: Record<string, RecentSessionType[]> = {};
    for (const session of recentSessionsResult.data || []) {
      if (!recentSessionsByBook[session.book_id]) {
        recentSessionsByBook[session.book_id] = [];
      }
      recentSessionsByBook[session.book_id]!.push(session);
    }

    // Calculate last_read_at, pages in last 7 days, and velocity for each book
    for (const bookId of bookIds) {
      const allSessions = allSessionsByBook[bookId] || [];
      const recentSessions = recentSessionsByBook[bookId] || [];

      // Get last_read_at: use MAX of last_read_at, ended_at, or started_at from all sessions
      let lastReadAt: Date | null = null;
      for (const session of allSessions) {
        const sessionDate = session.last_read_at
          ? new Date(session.last_read_at)
          : session.ended_at
          ? new Date(session.ended_at)
          : session.started_at
          ? new Date(session.started_at)
          : null;

        if (sessionDate && (!lastReadAt || sessionDate > lastReadAt)) {
          lastReadAt = sessionDate;
        }
      }

      // Sum pages_read in last 7 days (from recent sessions only)
      const pagesLast7Days = recentSessions.reduce(
        (sum, session) => sum + (session.pages_read || 0),
        0
      );

      // Calculate velocity (average pages per day over last 7 days)
      const velocity = pagesLast7Days > 0 ? pagesLast7Days / 7 : 0;

      sessionDataMap[bookId] = {
        lastReadAt,
        pagesLast7Days,
        velocity,
      };
    }

    // Build ordered result
    const orderedBooks: BookWithProgress[] = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;

        const progress = progressMap[ub.book_id];
        const sessionData = sessionDataMap[ub.book_id] || {
          lastReadAt: null,
          pagesLast7Days: 0,
          velocity: 0,
        };

        const currentProgress = progress?.pages_read || 0;
        const pageCount = book.page_count || 0;
        const pagesLeft =
          pageCount > 0 ? Math.max(0, pageCount - currentProgress) : 0;

        return {
          ...book,
          progress,
          userBook: ub,
          lastReadDate: sessionData.lastReadAt,
          velocity: sessionData.velocity,
          pages_left: pagesLeft,
          date_added: ub.date_added,
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
