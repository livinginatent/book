"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";

export interface ReadingStatsResult {
  success: true;
  booksRead: number;
  pagesRead: number;
  readingStreak: number;
  avgPagesPerDay: number;
}

export interface ReadingStatsError {
  success: false;
  error: string;
}

/**
 * Get reading stats for currently reading books
 * Optimized with parallel queries
 */
export async function getReadingStats(): Promise<
  ReadingStatsResult | ReadingStatsError
> {
  const timer = createTimer("getReadingStats");
  
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getReadingStats.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    // Parallel queries for all data we need
    const queryTimer = createTimer("getReadingStats.queries");
    const [
      currentlyReadingResult,
      finishedBooksResult,
      sessionsResult,
    ] = await Promise.all([
      supabase
        .from("user_books")
        .select("book_id")
        .eq("user_id", user.id)
        .eq("status", "currently_reading"),
      supabase
        .from("user_books")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "finished")
        .gte("date_finished", yearStart),
      supabase
        .from("reading_sessions")
        .select("session_date")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false })
        .limit(365),
    ]);
    queryTimer.end();

    const bookIds = (currentlyReadingResult.data || []).map((ub) => ub.book_id);
    const booksRead = (finishedBooksResult.data || []).length;
    const sessions = sessionsResult.data || [];

    // Get reading progress if there are currently reading books
    let pagesRead = 0;
    let avgPagesPerDay = 0;

    if (bookIds.length > 0) {
      const { data: progressList } = await supabase
        .from("reading_progress")
        .select("pages_read, started_at")
        .eq("user_id", user.id)
        .in("book_id", bookIds);

      if (progressList && progressList.length > 0) {
        pagesRead = progressList.reduce(
          (sum, p) => sum + (p.pages_read || 0),
          0
        );

        const now = Date.now();
        let totalDays = 0;
        for (const p of progressList) {
          if (p.started_at) {
            const daysSinceStart = Math.max(
              1,
              Math.ceil((now - new Date(p.started_at).getTime()) / (1000 * 60 * 60 * 24))
            );
            totalDays += daysSinceStart;
          }
        }
        if (totalDays > 0) {
          avgPagesPerDay = Math.round(pagesRead / totalDays);
        }
      }
    }

    // Calculate reading streak
    let readingStreak = 0;
    if (sessions.length > 0) {
      const uniqueDates = new Set(
        sessions.map((s) => s.session_date.split("T")[0])
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date(today);

      while (true) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (uniqueDates.has(dateStr)) {
          readingStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    timer.end();
    return {
      success: true,
      booksRead,
      pagesRead,
      readingStreak,
      avgPagesPerDay,
    };
  } catch (error) {
    timer.end();
    console.error("Get reading stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

