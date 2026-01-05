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

export type ReadingStatsPeriod = "1month" | "3months" | "6months" | "year" | "ytd";

/**
 * Get reading stats for a specific time period
 * Optimized with parallel queries
 */
export async function getReadingStats(
  period: ReadingStatsPeriod = "ytd"
): Promise<ReadingStatsResult | ReadingStatsError> {
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

    // Calculate date range based on period
    const now = new Date();
    const currentYear = now.getFullYear();
    let dateStart: string;
    
    switch (period) {
      case "1month": {
        // Use exactly 30 days for consistency with dashboard's "30-Day Rolling Average"
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        dateStart = thirtyDaysAgo.toISOString().split("T")[0];
        break;
      }
      case "3months": {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        dateStart = threeMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "6months": {
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        dateStart = sixMonthsAgo.toISOString().split("T")[0];
        break;
      }
      case "year": {
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        dateStart = oneYearAgo.toISOString().split("T")[0];
        break;
      }
      case "ytd":
      default: {
        dateStart = `${currentYear}-01-01`;
        break;
      }
    }

    // Parallel queries for all data we need
    const queryTimer = createTimer("getReadingStats.queries");
    const [
      finishedBooksResult,
      sessionsResult,
    ] = await Promise.all([
      supabase
        .from("user_books")
        .select("id, book_id")
        .eq("user_id", user.id)
        .eq("status", "finished")
        .gte("date_finished", dateStart),
      supabase
        .from("reading_sessions")
        .select("pages_read, session_date")
        .eq("user_id", user.id)
        .gte("session_date", dateStart)
        .order("session_date", { ascending: false }),
    ]);
    queryTimer.end();

    const finishedBooks = finishedBooksResult.data || [];
    const sessions = sessionsResult.data || [];
    
    const booksRead = finishedBooks.length;

    // Calculate pages read in the period from reading sessions
    // This gives us the actual pages read during the period, regardless of when books were started
    const pagesRead = sessions.reduce((sum, session) => sum + (session.pages_read || 0), 0);

    // Calculate average pages per day
    // Use actual days with reading sessions, or fall back to period duration
    let avgPagesPerDay = 0;
    if (sessions.length > 0) {
      const uniqueDates = new Set(
        sessions.map((s) => s.session_date.split("T")[0])
      );
      const daysWithReading = uniqueDates.size;
      
      // Calculate period duration as fallback
      const periodEnd = now.getTime();
      const periodStart = new Date(dateStart).getTime();
      const daysInPeriod = Math.max(
        1,
        Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24))
      );

      // Use days with reading or period duration, whichever makes more sense
      // For average, we'll use period duration to show consistent rate
      if (daysInPeriod > 0) {
        avgPagesPerDay = Math.round(pagesRead / daysInPeriod);
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

