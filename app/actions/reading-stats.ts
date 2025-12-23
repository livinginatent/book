"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export interface ReadingStatsResult {
  success: true;
  booksRead: number; // Finished books (this year)
  pagesRead: number; // Total pages read across all currently reading books
  readingStreak: number; // Consecutive days with reading sessions
  avgPagesPerDay: number; // Average pages per day across all currently reading books
}

export interface ReadingStatsError {
  success: false;
  error: string;
}

/**
 * Get reading stats for currently reading books
 */
export async function getReadingStats(): Promise<
  ReadingStatsResult | ReadingStatsError
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

    // Get all currently reading books
    const { data: currentlyReadingBooks, error: booksError } = await supabase
      .from("user_books")
      .select("book_id")
      .eq("user_id", user.id)
      .eq("status", "currently_reading");

    if (booksError) {
      console.error("Error fetching currently reading books:", booksError);
      return { success: false, error: "Failed to fetch books" };
    }

    const bookIds = (currentlyReadingBooks || []).map((ub) => ub.book_id);

    // Get reading progress for all currently reading books
    let progressList: any[] = [];
    let progressError = null;
    
    if (bookIds.length > 0) {
      const { data, error } = await supabase
        .from("reading_progress")
        .select("pages_read, started_at")
        .eq("user_id", user.id)
        .in("book_id", bookIds);
      progressList = data || [];
      progressError = error;
    }

    if (progressError) {
      console.error("Error fetching reading progress:", progressError);
      return { success: false, error: "Failed to fetch reading progress" };
    }

    // Calculate total pages read across all currently reading books
    const pagesRead = (progressList || []).reduce(
      (sum, p) => sum + (p.pages_read || 0),
      0
    );

    // Calculate average pages per day
    let avgPagesPerDay = 0;
    if (progressList && progressList.length > 0) {
      const now = Date.now();
      const totalDays = progressList.reduce((sum, p) => {
        if (p.started_at) {
          const startDate = new Date(p.started_at);
          const daysSinceStart = Math.max(
            1,
            Math.ceil((now - startDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          return sum + daysSinceStart;
        }
        return sum;
      }, 0);

      if (totalDays > 0) {
        avgPagesPerDay = Math.round(pagesRead / totalDays);
      }
    }

    // Count finished books this year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).toISOString().split("T")[0];

    const { data: finishedBooks, error: finishedError } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "finished")
      .gte("date_finished", yearStart);

    if (finishedError) {
      console.error("Error fetching finished books:", finishedError);
      // Don't fail, just use 0
    }

    const booksRead = (finishedBooks || []).length;

    // Calculate reading streak from reading sessions
    // Get all reading sessions ordered by date
    const { data: allSessions, error: sessionsError } = await supabase
      .from("reading_sessions")
      .select("session_date")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false });

    let readingStreak = 0;
    if (!sessionsError && allSessions && allSessions.length > 0) {
      // Get unique dates (in case multiple sessions per day)
      const uniqueDates = new Set(
        (allSessions || []).map((s) => s.session_date.split("T")[0])
      );

      // Calculate consecutive days from today backwards
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDate = new Date(today);
      let streakCount = 0;

      // Check consecutive days starting from today
      while (true) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (uniqueDates.has(dateStr)) {
          streakCount++;
          // Move to previous day
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          // No session on this day, streak is broken
          break;
        }
      }

      readingStreak = streakCount;
    }

    return {
      success: true,
      booksRead,
      pagesRead,
      readingStreak,
      avgPagesPerDay,
    };
  } catch (error) {
    console.error("Get reading stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

