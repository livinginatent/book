"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";

// ============================================================================
// Types
// ============================================================================

export interface HeatmapDataPoint {
  date: string;
  count: number;
}

export interface ForecastBook {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  pagesPerDay: number;
  estimatedFinish: string;
}

export interface VelocityStatsResult {
  success: true;
  // Heatmap data
  heatmapData: HeatmapDataPoint[];
  // Daily average stats
  avgPagesPerDay: number;
  weeklyTotal: number;
  activeDaysLast30: number;
  totalPagesLast30Days: number;
  // Streak data
  currentStreak: number;
  bestStreak: number;
  // Year-to-date stats
  ytdPages: number;
  booksFinishedYtd: number;
  // Forecast data
  forecastBooks: ForecastBook[];
}

export interface VelocityStatsError {
  success: false;
  error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStreaks(sessions: { session_date: string; pages_read: number }[]): {
  current: number;
  best: number;
} {
  if (sessions.length === 0) return { current: 0, best: 0 };

  // Get unique dates with pages_read > 0, sorted descending
  const uniqueDates = [...new Set(
    sessions
      .filter((s) => s.pages_read > 0)
      .map((s) => s.session_date.split("T")[0])
  )].sort((a, b) => b.localeCompare(a));

  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  // Calculate current streak (from today going backwards)
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(today);

  // Check if we read today or yesterday to start the streak
  const todayStr = checkDate.toISOString().split("T")[0];
  const yesterdayDate = new Date(checkDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const hasToday = uniqueDates.includes(todayStr);
  const hasYesterday = uniqueDates.includes(yesterdayStr);

  if (!hasToday && !hasYesterday) {
    currentStreak = 0;
  } else {
    // Start from today if read today, otherwise from yesterday
    if (hasToday) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days backwards
    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (uniqueDates.includes(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate best streak (scan through all dates)
  let bestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const nextDate = new Date(uniqueDates[i + 1]);
    const diffDays = Math.round(
      (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  return { current: currentStreak, best: Math.max(bestStreak, currentStreak) };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Get velocity stats for the current user including:
 * - Heatmap data for last 365 days
 * - Average pages per day (last 30 active days)
 * - Weekly total pages
 * - Current and best reading streaks
 * - Year-to-date stats
 * - Predicted finish dates for currently reading books
 */
export async function getVelocityStats(): Promise<
  VelocityStatsResult | VelocityStatsError
> {
  const timer = createTimer("getVelocityStats");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Authenticate user
    const authTimer = createTimer("getVelocityStats.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Calculate date boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01`;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
    const yearAgoStr = yearAgo.toISOString().split("T")[0];

    // Parallel queries for all data we need
    const queryTimer = createTimer("getVelocityStats.queries");
    const [sessionsResult, userBooksResult, finishedBooksResult] = await Promise.all([
      // 1. Get all reading sessions for last 365 days
      supabase
        .from("reading_sessions")
        .select("session_date, pages_read")
        .eq("user_id", user.id)
        .gte("session_date", yearAgoStr)
        .order("session_date", { ascending: true }),

      // 2. Get currently reading books with their book details
      supabase
        .from("user_books")
        .select(`
          book_id,
          books (
            id,
            title,
            authors,
            page_count
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "currently_reading"),

      // 3. Get finished books this year for YTD stats
      supabase
        .from("user_books")
        .select(`
          book_id,
          books (
            page_count
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "finished")
        .gte("date_finished", yearStart),
    ]);
    queryTimer.end();

    if (sessionsResult.error) {
      console.error("Error fetching sessions:", sessionsResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch reading sessions" };
    }

    if (userBooksResult.error) {
      console.error("Error fetching user books:", userBooksResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch currently reading books" };
    }

    const sessions = sessionsResult.data || [];
    const userBooks = userBooksResult.data || [];
    const finishedBooks = finishedBooksResult.data || [];

    // ========================================================================
    // Step 1: Build heatmap data (group sessions by date, sum pages_read)
    // ========================================================================
    const heatmapMap = new Map<string, number>();

    for (const session of sessions) {
      const dateKey = session.session_date.split("T")[0];
      const currentCount = heatmapMap.get(dateKey) || 0;
      heatmapMap.set(dateKey, currentCount + (session.pages_read || 0));
    }

    const heatmapData: HeatmapDataPoint[] = Array.from(heatmapMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ========================================================================
    // Step 2: Calculate weekly total (last 7 days)
    // ========================================================================
    const weeklyTotal = sessions
      .filter((s) => s.session_date >= sevenDaysAgoStr)
      .reduce((sum, s) => sum + (s.pages_read || 0), 0);

    // ========================================================================
    // Step 3: Calculate average pages per day (last 30 active days)
    // ========================================================================
    const last30DaysSessions = sessions.filter(
      (s) => s.session_date >= thirtyDaysAgoStr
    );

    // Group by date to find active days and sum pages
    const activeDaysMap = new Map<string, number>();
    for (const session of last30DaysSessions) {
      const dateKey = session.session_date.split("T")[0];
      const currentPages = activeDaysMap.get(dateKey) || 0;
      activeDaysMap.set(dateKey, currentPages + (session.pages_read || 0));
    }

    // Only count days where pages_read > 0
    const activeDaysWithReading = Array.from(activeDaysMap.entries()).filter(
      ([, pages]) => pages > 0
    );
    const activeDaysLast30 = activeDaysWithReading.length;
    const totalPagesLast30Days = activeDaysWithReading.reduce(
      (sum, [, pages]) => sum + pages,
      0
    );

    const avgPagesPerDay =
      activeDaysLast30 > 0
        ? Math.round(totalPagesLast30Days / activeDaysLast30)
        : 0;

    // ========================================================================
    // Step 4: Calculate streaks
    // ========================================================================
    const { current: currentStreak, best: bestStreak } = calculateStreaks(sessions);

    // ========================================================================
    // Step 5: Calculate YTD stats
    // ========================================================================
    const ytdSessions = sessions.filter((s) => s.session_date >= yearStart);
    const ytdPages = ytdSessions.reduce((sum, s) => sum + (s.pages_read || 0), 0);
    const booksFinishedYtd = finishedBooks.length;

    // ========================================================================
    // Step 6: Get reading progress for currently reading books
    // ========================================================================
    const bookIds = userBooks
      .map((ub) => ub.book_id)
      .filter((id): id is string => !!id);

    let progressMap: Record<string, number> = {};

    if (bookIds.length > 0) {
      const { data: progressData } = await supabase
        .from("reading_progress")
        .select("book_id, pages_read")
        .eq("user_id", user.id)
        .in("book_id", bookIds);

      if (progressData) {
        for (const p of progressData) {
          progressMap[p.book_id] = p.pages_read || 0;
        }
      }
    }

    // ========================================================================
    // Step 7: Build forecast books with predicted finish dates
    // ========================================================================
    const forecastBooks: ForecastBook[] = userBooks
      .map((ub) => {
        const book = ub.books as unknown as {
          id: string;
          title: string;
          authors: string[];
          page_count: number | null;
        } | null;

        if (!book) return null;

        const totalPages = book.page_count || 0;
        const currentPage = progressMap[ub.book_id] || 0;
        const pagesRemaining = Math.max(0, totalPages - currentPage);

        // Use user's average velocity for predictions
        const pagesPerDay = avgPagesPerDay > 0 ? avgPagesPerDay : 20; // Default to 20 if no data
        const daysToFinish = pagesRemaining > 0 
          ? Math.ceil(pagesRemaining / pagesPerDay)
          : 0;

        const estimatedFinishDate = new Date();
        estimatedFinishDate.setDate(estimatedFinishDate.getDate() + daysToFinish);

        return {
          id: book.id,
          title: book.title,
          author: book.authors?.[0] || "Unknown Author",
          currentPage,
          totalPages,
          pagesPerDay,
          estimatedFinish: estimatedFinishDate.toISOString(),
        };
      })
      .filter((book): book is ForecastBook => book !== null && book.totalPages > 0);

    timer.end();

    return {
      success: true,
      heatmapData,
      avgPagesPerDay,
      weeklyTotal,
      activeDaysLast30,
      totalPagesLast30Days,
      currentStreak,
      bestStreak,
      ytdPages,
      booksFinishedYtd,
      forecastBooks,
    };
  } catch (error) {
    timer.end();
    console.error("Get velocity stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
