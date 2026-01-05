"use server";

import { cookies } from "next/headers";

import {
  getAllActiveGoals,
  getAllAchievedGoals,
} from "@/app/actions/reading-goals";
import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { ReadingGoal } from "@/types/user.type";

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

export type VelocityRange = "30days" | "ytd" | "alltime";

export interface VelocityStatsResult {
  success: true;
  range: VelocityRange;
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
  // Range-specific stats
  totalPages: number;
  booksFinished: number;
  rangeLabel: string;
  // Forecast data
  forecastBooks: ForecastBook[];
}

export interface VelocityStatsError {
  success: false;
  error: string;
}

export interface ReadingDNAResult {
  success: true;
  moods: { name: string; count: number }[];
  pacingStats: { label: string; avgRating: number }[];
  complexity: { level: string; count: number }[];
  subjects: { name: string; count: number; avgRating: number }[];
  structuralFlags: { key: string; percentage: number }[];
  formats: { physical: number; digital: number; audiobook: number };
  diverseCastPercent: number;
  acquisitionData: Array<{ name: string; value: number }>;
  winningCombo: {
    description: string;
    avgRating: number;
    bookCount: number;
  } | null;
}

export interface ReadingDNAError {
  success: false;
  error: string;
}

export interface MoodSummaryResult {
  success: true;
  hasEnoughData: boolean;
  moods: Array<{ mood: string; color: string }>;
  pacing: string | null;
}

export interface MoodSummaryError {
  success: false;
  error: string;
}

export interface ActiveGoalInsight {
  id: string;
  type: string;
  target: number;
  current: number;
  requiredDailyPace: number;
  timeElapsedPercent: number;
  progressPercent: number;
  isOnTrack: boolean;
  endDate: string;
}

export interface PaceAlert {
  goalId: string;
  goalType: string;
  severity: "warning" | "critical";
  message: string;
  requiredDailyPace: number;
  currentProgress: number;
  target: number;
}

export interface GoalInsightsResult {
  success: true;
  activeGoals: ActiveGoalInsight[];
  successRate: number;
  paceAlerts: PaceAlert[];
}

export interface GoalInsightsError {
  success: false;
  error: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStreaks(
  sessions: { session_date: string; pages_read: number }[]
): {
  current: number;
  best: number;
} {
  if (sessions.length === 0) return { current: 0, best: 0 };

  // Get unique dates with pages_read > 0, sorted descending
  const uniqueDates = [
    ...new Set(
      sessions
        .filter((s) => s.pages_read > 0)
        .map((s) => s.session_date.split("T")[0])
    ),
  ].sort((a, b) => b.localeCompare(a));

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
 * - Range-specific stats (30 days, YTD, or All Time)
 * - Predicted finish dates for currently reading books
 */
export async function getVelocityStats(
  range: VelocityRange = "ytd"
): Promise<VelocityStatsResult | VelocityStatsError> {
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

    // Calculate date boundaries based on range
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

    // Determine date filter and label based on range
    let dateFilter: string;
    let rangeLabel: string;
    let finishedBooksFilter: string | undefined;

    switch (range) {
      case "30days":
        dateFilter = thirtyDaysAgoStr;
        rangeLabel = "Last 30 Days";
        finishedBooksFilter = thirtyDaysAgoStr; // Finished books in last 30 days
        break;
      case "ytd":
        dateFilter = yearStart;
        rangeLabel = `Year to Date (${currentYear})`;
        finishedBooksFilter = yearStart;
        break;
      case "alltime":
        dateFilter = "1970-01-01"; // All time
        rangeLabel = "All Time";
        finishedBooksFilter = undefined; // All finished books
        break;
    }

    // Parallel queries for all data we need
    const queryTimer = createTimer("getVelocityStats.queries");

    // Build finished books query based on range
    let finishedBooksQuery = supabase
      .from("user_books")
      .select(
        `
        book_id,
        books (
          page_count
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "finished");

    if (finishedBooksFilter) {
      finishedBooksQuery = finishedBooksQuery.gte(
        "date_finished",
        finishedBooksFilter
      );
    }

    const [sessionsResult, userBooksResult, finishedBooksResult] =
      await Promise.all([
        // 1. Get reading sessions based on range (always get last 365 days for heatmap)
        supabase
          .from("reading_sessions")
          .select("session_date, pages_read")
          .eq("user_id", user.id)
          .gte("session_date", range === "alltime" ? "1970-01-01" : yearAgoStr)
          .order("session_date", { ascending: true }),

        // 2. Get currently reading books with their book details
        supabase
          .from("user_books")
          .select(
            `
          book_id,
          books (
            id,
            title,
            authors,
            page_count
          )
        `
          )
          .eq("user_id", user.id)
          .eq("status", "currently_reading"),

        // 3. Get finished books based on range
        finishedBooksQuery,
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
      return {
        success: false,
        error: "Failed to fetch currently reading books",
      };
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
    // Step 3: Calculate average pages per day based on selected range
    // ========================================================================
    // Use range-specific sessions for velocity calculation
    const rangeSessionsForVelocity = sessions.filter(
      (s) => s.session_date >= dateFilter
    );

    // Group by date to find active days and sum pages
    const activeDaysMap = new Map<string, number>();
    for (const session of rangeSessionsForVelocity) {
      const dateKey = session.session_date.split("T")[0];
      const currentPages = activeDaysMap.get(dateKey) || 0;
      activeDaysMap.set(dateKey, currentPages + (session.pages_read || 0));
    }

    // Only count days where pages_read > 0
    const activeDaysWithReading = Array.from(activeDaysMap.entries()).filter(
      ([, pages]) => pages > 0
    );
    const activeDaysInRange = activeDaysWithReading.length;
    const totalPagesInRange = activeDaysWithReading.reduce(
      (sum, [, pages]) => sum + pages,
      0
    );

    const avgPagesPerDay =
      activeDaysInRange > 0
        ? Math.round(totalPagesInRange / activeDaysInRange)
        : 0;

    // Also calculate last 30 days stats for display purposes
    const last30DaysSessions = sessions.filter(
      (s) => s.session_date >= thirtyDaysAgoStr
    );
    const last30DaysMap = new Map<string, number>();
    for (const session of last30DaysSessions) {
      const dateKey = session.session_date.split("T")[0];
      const currentPages = last30DaysMap.get(dateKey) || 0;
      last30DaysMap.set(dateKey, currentPages + (session.pages_read || 0));
    }
    const activeDaysLast30 = Array.from(last30DaysMap.entries()).filter(
      ([, pages]) => pages > 0
    ).length;
    const totalPagesLast30Days = Array.from(last30DaysMap.entries())
      .filter(([, pages]) => pages > 0)
      .reduce((sum, [, pages]) => sum + pages, 0);

    // ========================================================================
    // Step 4: Calculate streaks
    // ========================================================================
    const { current: currentStreak, best: bestStreak } =
      calculateStreaks(sessions);

    // ========================================================================
    // Step 5: Calculate range-specific stats
    // ========================================================================
    const rangeSessions = sessions.filter((s) => s.session_date >= dateFilter);
    const totalPages = rangeSessions.reduce(
      (sum, s) => sum + (s.pages_read || 0),
      0
    );
    const booksFinished = finishedBooks.length;

    // ========================================================================
    // Step 6: Get reading progress for currently reading books
    // ========================================================================
    const bookIds = userBooks
      .map((ub) => ub.book_id)
      .filter((id): id is string => !!id);

    const progressMap: Record<string, number> = {};

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
        const daysToFinish =
          pagesRemaining > 0 ? Math.ceil(pagesRemaining / pagesPerDay) : 0;

        const estimatedFinishDate = new Date();
        estimatedFinishDate.setDate(
          estimatedFinishDate.getDate() + daysToFinish
        );

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
      .filter(
        (book): book is ForecastBook => book !== null && book.totalPages > 0
      );

    timer.end();

    return {
      success: true,
      range,
      heatmapData,
      avgPagesPerDay,
      weeklyTotal,
      activeDaysLast30,
      totalPagesLast30Days,
      currentStreak,
      bestStreak,
      totalPages,
      booksFinished,
      rangeLabel,
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

/**
 * Get Reading DNA analytics for the current user
 * Analyzes reading patterns, preferences, and characteristics from finished books
 */
export async function getReadingDNA(): Promise<
  ReadingDNAResult | ReadingDNAError
> {
  const timer = createTimer("getReadingDNA");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Authenticate user
    const authTimer = createTimer("getReadingDNA.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Query finished books with review_attributes, subjects, and reading_format
    const queryTimer = createTimer("getReadingDNA.queries");
    const { data: finishedBooks, error: queryError } = await supabase
      .from("user_books")
      .select(
        `
        rating,
        review_attributes,
        reading_format,
        subjects
      `
      )
      .eq("user_id", user.id)
      .eq("status", "finished")
      .not("review_attributes", "is", null);
    queryTimer.end();

    if (queryError) {
      console.error("Error fetching finished books:", queryError);
      timer.end();
      return {
        success: false,
        error: "Failed to fetch finished books",
      };
    }

    if (!finishedBooks || finishedBooks.length === 0) {
      timer.end();
      return {
        success: true,
        moods: [],
        pacingStats: [],
        complexity: [],
        subjects: [],
        structuralFlags: [],
        formats: { physical: 0, digital: 0, audiobook: 0 },
        diverseCastPercent: 0,
        acquisitionData: [],
        winningCombo: null,
      };
    }

    // Process the data
    const moodsMap = new Map<string, number>();
    const pacingMap = new Map<string, { total: number; count: number }>();
    const difficultyMap = new Map<string, number>();
    const subjectsMap = new Map<
      string,
      { count: number; totalRating: number; ratingCount: number }
    >();
    const structuralFlagsMap = new Map<
      string,
      { trueCount: number; total: number }
    >();
    const formatMap = new Map<string, number>();
    let diverseCastCount = 0;
    let totalBooks = 0;

    for (const userBook of finishedBooks) {
      const reviewAttrs = userBook.review_attributes as Record<
        string,
        unknown
      > | null;
      if (!reviewAttrs) continue;

      const rating = userBook.rating as number | null;
      const readingFormat = userBook.reading_format as string | null;
      const subjects = (userBook.subjects as string[] | null) || [];

      // 1. Extract moods from review_attributes->'moods' array
      const moods = reviewAttrs.moods;
      if (Array.isArray(moods)) {
        for (const mood of moods) {
          if (typeof mood === "string") {
            moodsMap.set(mood, (moodsMap.get(mood) || 0) + 1);
          }
        }
      }

      // 2. Group by pacing and calculate avg rating
      // Attribute Fallback: Only include if pacing is not null/empty
      const pacing = reviewAttrs.pacing;
      if (
        pacing !== null &&
        pacing !== undefined &&
        typeof pacing === "string" &&
        pacing.trim() !== "" &&
        rating !== null
      ) {
        const existing = pacingMap.get(pacing) || { total: 0, count: 0 };
        existing.total += rating;
        existing.count += 1;
        pacingMap.set(pacing, existing);
      }

      // 3. Group by difficulty
      // Attribute Fallback: Only include if difficulty is not null/empty
      const difficulty = reviewAttrs.difficulty;
      if (
        difficulty !== null &&
        difficulty !== undefined &&
        typeof difficulty === "string" &&
        difficulty.trim() !== ""
      ) {
        difficultyMap.set(difficulty, (difficultyMap.get(difficulty) || 0) + 1);
      }

      // 4. Structural flags - check for boolean values
      // Match the attribute names from book-review-form.tsx
      const structuralFlagKeys = [
        "plot_driven",
        "diverse_cast",
        "multiple_pov",
        "character_development",
        "world_building",
        "twist_ending",
        "strong_prose",
      ];

      for (const key of structuralFlagKeys) {
        const flagValue = reviewAttrs[key];
        const existing = structuralFlagsMap.get(key) || {
          trueCount: 0,
          total: 0,
        };
        existing.total += 1;
        if (flagValue === true || flagValue === "true") {
          existing.trueCount += 1;
        }
        structuralFlagsMap.set(key, existing);
      }

      // Track diverse_cast for percentage calculation
      totalBooks += 1;
      const diverseCast = reviewAttrs.diverse_cast;
      if (diverseCast === true || diverseCast === "true") {
        diverseCastCount += 1;
      }

      // Track reading format
      if (readingFormat) {
        const formatKey = readingFormat === "ebook" ? "digital" : readingFormat;
        formatMap.set(formatKey, (formatMap.get(formatKey) || 0) + 1);
      } else {
        // Default to physical if not specified
        formatMap.set("physical", (formatMap.get("physical") || 0) + 1);
      }

      // 5. Subject analysis - use subjects from user_books
      // Process subjects even without ratings (for genre landscape)
      // Subject Fallback: If subjects is null or empty, label as 'Uncategorized'
      if (
        !subjects ||
        !Array.isArray(subjects) ||
        subjects.length === 0 ||
        subjects.every((s) => !s || typeof s !== "string" || s.trim() === "")
      ) {
        // Fallback to 'Uncategorized' - only count if has rating
        if (rating !== null) {
          const existing = subjectsMap.get("Uncategorized") || {
            count: 0,
            totalRating: 0,
            ratingCount: 0,
          };
          existing.count += 1;
          existing.totalRating += rating;
          existing.ratingCount += 1;
          subjectsMap.set("Uncategorized", existing);
        }
      } else {
        // Process valid subjects
        for (const subject of subjects) {
          if (typeof subject === "string" && subject.trim() !== "") {
            const existing = subjectsMap.get(subject) || {
              count: 0,
              totalRating: 0,
              ratingCount: 0,
            };
            // Always count the book for this subject
            existing.count += 1;
            // Only add to rating calculations if rating exists
            if (rating !== null) {
              existing.totalRating += rating;
              existing.ratingCount += 1;
            }
            subjectsMap.set(subject, existing);
          }
        }
      }
    }

    // Convert maps to arrays and format results
    // Threshold: Only include moods if encountered at least twice
    const moods = Array.from(moodsMap.entries())
      .filter(([, count]) => count >= 2)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Rounding: Round avgRating to 2 decimal places
    const pacingStats = Array.from(pacingMap.entries())
      .map(([label, data]) => ({
        label,
        avgRating:
          data.count > 0
            ? Math.round((data.total / data.count) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.avgRating - a.avgRating);

    const complexity = Array.from(difficultyMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count);

    // Threshold: Only include subjects if encountered at least once (lowered from 2)
    // Rounding: Round avgRating to 2 decimal places
    const subjects = Array.from(subjectsMap.entries())
      .filter(([, data]) => data.count >= 1)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRating:
          data.ratingCount > 0
            ? Math.round((data.totalRating / data.ratingCount) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 (increased from 5)

    const structuralFlags = Array.from(structuralFlagsMap.entries())
      .map(([key, data]) => ({
        key,
        percentage: data.total > 0 ? (data.trueCount / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate format distribution
    const formats = {
      physical: formatMap.get("physical") || 0,
      digital: formatMap.get("digital") || 0,
      audiobook: formatMap.get("audiobook") || 0,
    };

    // Calculate diverse cast percentage
    const diverseCastPercent =
      totalBooks > 0 ? Math.round((diverseCastCount / totalBooks) * 100) : 0;

    // Calculate acquisition data (disabled for now - will be implemented in the future)
    // TODO: Implement actual acquisition tracking when feature is ready
    const acquisitionData: Array<{ name: string; value: number }> = [];

    // Calculate winning combo (best subject + pacing combination)
    let winningCombo: {
      description: string;
      avgRating: number;
      bookCount: number;
    } | null = null;

    if (subjects.length > 0 && pacingStats.length > 0) {
      const topSubject = subjects[0];
      const topPacing = pacingStats[0];
      winningCombo = {
        description: `${topSubject.name} + ${topPacing.label}`,
        avgRating: (topSubject.avgRating + topPacing.avgRating) / 2,
        bookCount: topSubject.count,
      };
    }

    timer.end();

    return {
      success: true,
      moods,
      pacingStats,
      complexity,
      subjects,
      structuralFlags,
      formats,
      diverseCastPercent,
      acquisitionData,
      winningCombo,
    };
  } catch (error) {
    timer.end();
    console.error("Get reading DNA error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get mood summary from highly-rated finished books and currently reading books
 * Returns top 4 most frequent moods and most frequent pacing
 * Requires at least 3 books with mood tags to return data
 */
export async function getMoodSummary(): Promise<
  MoodSummaryResult | MoodSummaryError
> {
  const timer = createTimer("getMoodSummary");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Authenticate user
    const authTimer = createTimer("getMoodSummary.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Query Timer
    const queryTimer = createTimer("getMoodSummary.queries");

    // Scope A: Last 10 finished books with rating >= 4
    const { data: finishedBooks, error: finishedError } = await supabase
      .from("user_books")
      .select("review_attributes")
      .eq("user_id", user.id)
      .eq("status", "finished")
      .gte("rating", 4)
      .not("review_attributes", "is", null)
      .order("date_finished", { ascending: false })
      .limit(10);

    // Scope B: All currently reading books
    const { data: currentlyReadingBooks, error: currentlyReadingError } =
      await supabase
        .from("user_books")
        .select("review_attributes")
        .eq("user_id", user.id)
        .eq("status", "currently_reading")
        .not("review_attributes", "is", null);

    queryTimer.end();

    if (finishedError || currentlyReadingError) {
      console.error(
        "Error fetching books:",
        finishedError || currentlyReadingError
      );
      timer.end();
      return {
        success: false,
        error: "Failed to fetch books",
      };
    }

    // Combined pool: Merge both sets
    const combinedBooks = [
      ...(finishedBooks || []),
      ...(currentlyReadingBooks || []),
    ];

    // Helper function to get color for mood
    function getMoodColor(mood: string): string {
      const colorMap: Record<string, string> = {
        Dark: "purple",
        Lighthearted: "yellow",
        Emotional: "pink",
        Tense: "red",
        Reflective: "blue",
        Hopeful: "green",
        Melancholic: "indigo",
        Humorous: "orange",
        Suspenseful: "red",
        Romantic: "pink",
        Mysterious: "purple",
        Inspiring: "green",
        "Thought-provoking": "blue",
        Adventurous: "orange",
        Nostalgic: "amber",
      };
      return colorMap[mood] || "gray";
    }

    // Count books with at least one mood tag
    let booksWithMoods = 0;
    const moodsMap = new Map<string, number>();
    const pacingMap = new Map<string, number>();

    for (const userBook of combinedBooks) {
      const reviewAttrs = userBook.review_attributes as Record<
        string,
        unknown
      > | null;
      if (!reviewAttrs) continue;

      // Extract moods from review_attributes->'moods' array
      const moods = reviewAttrs.moods;
      if (Array.isArray(moods) && moods.length > 0) {
        booksWithMoods++;
        for (const mood of moods) {
          if (typeof mood === "string" && mood.trim() !== "") {
            moodsMap.set(mood, (moodsMap.get(mood) || 0) + 1);
          }
        }
      }

      // Extract pacing (count even if no moods)
      const pacing = reviewAttrs.pacing;
      if (
        pacing !== null &&
        pacing !== undefined &&
        typeof pacing === "string" &&
        pacing.trim() !== ""
      ) {
        pacingMap.set(pacing, (pacingMap.get(pacing) || 0) + 1);
      }
    }

    // Minimum Data Rule: Check if at least 3 books have mood tags
    if (booksWithMoods < 3) {
      timer.end();
      return {
        success: true,
        hasEnoughData: false,
        moods: [],
        pacing: null,
      };
    }

    // Get top 4 most frequent moods
    const topMoods = Array.from(moodsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([mood]) => ({
        mood,
        color: getMoodColor(mood),
      }));

    // Get most frequent pacing
    let mostFrequentPacing: string | null = null;
    if (pacingMap.size > 0) {
      const pacingEntries = Array.from(pacingMap.entries());
      pacingEntries.sort((a, b) => b[1] - a[1]);
      mostFrequentPacing = pacingEntries[0][0];
    }

    timer.end();

    return {
      success: true,
      hasEnoughData: true,
      moods: topMoods,
      pacing: mostFrequentPacing,
    };
  } catch (error) {
    timer.end();
    console.error("Get mood summary error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get goal insights for the current user including:
 * - Active goals with pace calculations
 * - Time analysis (elapsed vs progress)
 * - Success rate (completed vs total goals)
 * - Pace alerts for goals behind schedule
 */
export async function getGoalInsights(): Promise<
  GoalInsightsResult | GoalInsightsError
> {
  const timer = createTimer("getGoalInsights");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Fetch all active and completed goals
    const [activeGoalsResult, achievedGoalsResult, allGoalsResult] =
      await Promise.all([
        getAllActiveGoals(),
        getAllAchievedGoals(),
        // Fetch all goals to calculate success rate
        supabase
          .from("reading_goals")
          .select("id, status, created_at")
          .eq("user_id", user.id),
      ]);

    if (!activeGoalsResult.success) {
      timer.end();
      return {
        success: false,
        error: activeGoalsResult.error,
      };
    }

    if (!achievedGoalsResult.success) {
      timer.end();
      return {
        success: false,
        error: achievedGoalsResult.error,
      };
    }

    if (allGoalsResult.error) {
      timer.end();
      return {
        success: false,
        error: "Failed to fetch all goals",
      };
    }

    const activeGoals = activeGoalsResult.goals;
    const achievedGoals = achievedGoalsResult.goals;
    const allGoals = allGoalsResult.data || [];

    // Calculate success rate: completed goals / total goals
    const hasStatusColumn = allGoals.length > 0 && "status" in allGoals[0];
    const completedGoalsCount = hasStatusColumn
      ? allGoals.filter(
          (g) => (g as { status?: string }).status === "completed"
        ).length
      : achievedGoals.length;
    const totalGoalsCount = allGoals.length;
    const successRate =
      totalGoalsCount > 0
        ? Math.round((completedGoalsCount / totalGoalsCount) * 100)
        : 0;

    // Process active goals for insights
    const now = new Date();
    const activeGoalInsights: ActiveGoalInsight[] = [];
    const paceAlerts: PaceAlert[] = [];

    for (const goal of activeGoals) {
      const config = goal as ReadingGoal;
      const goalYear = config.year || now.getFullYear();
      const target = config.target || 0;
      const current = config.current || 0;

      // Calculate date range for the goal
      let dateStart: Date;
      let dateEnd: Date;

      if (config.endDate) {
        dateEnd = new Date(config.endDate);
        dateStart = config.startDate
          ? new Date(config.startDate)
          : new Date(goalYear, 0, 1);
      } else if (config.startDate) {
        dateStart = new Date(config.startDate);
        if (config.periodMonths) {
          dateEnd = new Date(dateStart);
          dateEnd.setMonth(dateEnd.getMonth() + config.periodMonths);
        } else {
          dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999);
        }
      } else if (config.periodMonths) {
        dateStart = new Date(now);
        dateEnd = new Date(now);
        dateEnd.setMonth(dateEnd.getMonth() + config.periodMonths);
      } else {
        dateStart = new Date(goalYear, 0, 1);
        dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999);
      }

      // Ensure dates are valid
      if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime())) {
        continue;
      }

      // Calculate time elapsed percentage
      const totalDuration = dateEnd.getTime() - dateStart.getTime();
      const elapsedDuration = now.getTime() - dateStart.getTime();
      const timeElapsedPercent =
        totalDuration > 0
          ? Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
          : 0;

      // Calculate progress percentage
      const progressPercent =
        target > 0 ? Math.min(100, (current / target) * 100) : 0;

      // Calculate required daily pace
      const daysRemaining = Math.max(
        0,
        Math.ceil((dateEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      const remaining = Math.max(0, target - current);
      const requiredDailyPace =
        daysRemaining > 0 ? remaining / daysRemaining : 0;

      // Determine if on track (progress should be >= time elapsed)
      const isOnTrack = progressPercent >= timeElapsedPercent;

      // Create insight for this goal
      activeGoalInsights.push({
        id: goal.id,
        type: goal.type,
        target,
        current,
        requiredDailyPace: Math.round(requiredDailyPace * 100) / 100,
        timeElapsedPercent: Math.round(timeElapsedPercent * 100) / 100,
        progressPercent: Math.round(progressPercent * 100) / 100,
        isOnTrack,
        endDate: dateEnd.toISOString().split("T")[0],
      });

      // Create pace alerts for goals behind schedule
      if (!isOnTrack && daysRemaining > 0) {
        const progressGap = timeElapsedPercent - progressPercent;
        const severity: "warning" | "critical" =
          progressGap > 20 ? "critical" : "warning";

        let message = "";
        const goalTypeLabel =
          goal.type === "books"
            ? "books"
            : goal.type === "pages"
            ? "pages"
            : goal.type === "genres"
            ? "genres"
            : "days";

        if (progressGap > 20) {
          message = `You're significantly behind on your ${goalTypeLabel} goal. You need to maintain a pace of ${
            Math.round(requiredDailyPace * 100) / 100
          } ${
            goalTypeLabel === "days" ? "reading days" : goalTypeLabel
          } per day to catch up.`;
        } else {
          message = `You're slightly behind on your ${goalTypeLabel} goal. Aim for ${
            Math.round(requiredDailyPace * 100) / 100
          } ${
            goalTypeLabel === "days" ? "reading days" : goalTypeLabel
          } per day to stay on track.`;
        }

        paceAlerts.push({
          goalId: goal.id,
          goalType: goal.type,
          severity,
          message,
          requiredDailyPace: Math.round(requiredDailyPace * 100) / 100,
          currentProgress: current,
          target,
        });
      }
    }

    timer.end();

    return {
      success: true,
      activeGoals: activeGoalInsights,
      successRate,
      paceAlerts,
    };
  } catch (error) {
    timer.end();
    console.error("Get goal insights error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
