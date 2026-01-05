"use server";

import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import { dbGoalToComponentGoal } from "@/lib/goal-wizard/goal-converters";
import type { ReadingStatus, Profile, ReadingProgress, Book, UserBook, ReadingGoal as DBReadingGoal, GoalType } from "@/types/database.types";
import type { ReadingGoal } from "@/types/user.type";

// ============================================================================
// Types
// ============================================================================

export interface BookWithProgress extends Book {
  progress?: ReadingProgress;
  userBook?: UserBook;
}

export interface ShelfData {
  id: string;
  name: string;
  type: "default" | "custom";
  bookCount: number;
  status?: string | null;
}

export interface ReadingStatsData {
  booksRead: number;
  pagesRead: number;
  readingStreak: number;
  avgPagesPerDay: number;
}

export interface GoalsData {
  activeGoals: ReadingGoal[];
  achievedGoals: ReadingGoal[];
  canCreate: boolean;
  currentCount: number;
  limit: number;
}

// Quick insights data (for AdvancedInsights component)
export interface QuickInsightsData {
  avgPagesPerDay: number;
  currentStreak: number;
  topGenre: string | null;
}

// Mood summary data (for MoodTracker component)
export interface MoodSummaryData {
  hasEnoughData: boolean;
  moods: Array<{ mood: string; color: string }>;
  pacing: string | null;
}

export interface DashboardData {
  success: true;
  user: {
    id: string;
    email: string | undefined;
  };
  profile: Profile | null;
  currentlyReading: BookWithProgress[];
  stats: ReadingStatsData;
  shelves: {
    default: ShelfData[];
    custom: ShelfData[];
  };
  goals: GoalsData;
  insights: QuickInsightsData;
  moodSummary: MoodSummaryData;
  timing: {
    total: number;
    auth: number;
    queries: number;
  };
}

export interface DashboardError {
  success: false;
  error: string;
}

// ============================================================================
// Main Dashboard Data Fetcher - Single auth call, parallel data fetching
// ============================================================================

/**
 * Fetches ALL dashboard data in a single server action with ONE auth call.
 * Uses parallel queries for maximum performance.
 * Memoized per request using React cache().
 */
export const getDashboardData = cache(async (): Promise<DashboardData | DashboardError> => {
  const totalTimer = createTimer("getDashboardData (total)");
  
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // ========================================================================
    // Step 1: Single auth call
    // ========================================================================
    const authTimer = createTimer("auth.getUser");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    const authTime = authTimer.end();

    if (authError || !user) {
      totalTimer.end();
      return { success: false, error: "You must be logged in" };
    }

    // ========================================================================
    // Step 2: Parallel data fetching - ALL queries at once
    // ========================================================================
    const queryTimer = createTimer("parallel queries");
    
    // Calculate date boundaries for queries
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const [
      profileResult,
      userBooksResult,
      shelvesResult,
      finishedBooksResult,
      sessionsResult,
      goalsResult,
      recentSessionsResult,
      moodBooksResult,
    ] = await Promise.all([
      // 1. Profile
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single(),
      
      // 2. All user books (we'll filter in memory)
      supabase
        .from("user_books")
        .select("*")
        .eq("user_id", user.id),
      
      // 3. Shelves
      supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      
      // 4. Finished books this year (for stats)
      supabase
        .from("user_books")
        .select("id, book_id, date_finished")
        .eq("user_id", user.id)
        .eq("status", "finished")
        .gte("date_finished", `${new Date().getFullYear()}-01-01`),
      
      // 5. Reading sessions (for streak)
      supabase
        .from("reading_sessions")
        .select("session_date")
        .eq("user_id", user.id)
        .order("session_date", { ascending: false })
        .limit(365), // Last year max
      
      // 6. Reading goals (all of them - we'll filter by status in memory)
      supabase
        .from("reading_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      // 7. Reading sessions for last 30 days (for velocity insights)
      supabase
        .from("reading_sessions")
        .select("session_date, pages_read")
        .eq("user_id", user.id)
        .gte("session_date", thirtyDaysAgoStr),

      // 8. Books with review_attributes for mood tracking (last 10 highly-rated finished + currently reading)
      supabase
        .from("user_books")
        .select("status, rating, review_attributes, subjects")
        .eq("user_id", user.id)
        .not("review_attributes", "is", null),
    ]);
    
    const queryTime = queryTimer.end();

    // Extract data from results
    const profile = profileResult.data;
    const allUserBooks = userBooksResult.data || [];
    const shelves = shelvesResult.data || [];
    const finishedBooks = finishedBooksResult.data || [];
    const sessions = sessionsResult.data || [];
    const allGoals = (goalsResult.data || []) as DBReadingGoal[];
    const recentSessions = recentSessionsResult.data || [];
    const moodBooks = moodBooksResult.data || [];

    // ========================================================================
    // Step 3: Get books and progress for currently reading
    // ========================================================================
    const currentlyReadingUserBooks = allUserBooks.filter(
      (ub) => ub.status === "currently_reading"
    );
    
    let booksWithProgress: BookWithProgress[] = [];
    let pagesRead = 0;
    let avgPagesPerDay = 0;

    if (currentlyReadingUserBooks.length > 0) {
      const bookIds = currentlyReadingUserBooks.map((ub) => ub.book_id);
      
      // Fetch books and progress in parallel
      const [booksResult, progressResult] = await Promise.all([
        supabase.from("books").select("*").in("id", bookIds),
        supabase
          .from("reading_progress")
          .select("*")
          .eq("user_id", user.id)
          .in("book_id", bookIds),
      ]);

      const books = booksResult.data || [];
      const progressList = progressResult.data || [];

      // Create lookup maps
      const progressMap: Record<string, ReadingProgress> = {};
      for (const p of progressList) {
        progressMap[p.book_id] = p;
      }

      // Build ordered list maintaining user_books order
      booksWithProgress = currentlyReadingUserBooks
        .map((ub) => {
          const book = books.find((b) => b.id === ub.book_id);
          if (!book) return null;
          return {
            ...book,
            progress: progressMap[ub.book_id],
            userBook: ub,
          };
        })
        .filter((b): b is BookWithProgress => b !== null);

      // Calculate stats from progress
      pagesRead = progressList.reduce((sum, p) => sum + (p.pages_read || 0), 0);
      
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

    // ========================================================================
    // Step 4: Calculate reading streak
    // ========================================================================
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

    // ========================================================================
    // Step 5: Build shelf data with counts from user_books
    // ========================================================================
    const statusCounts: Record<ReadingStatus, number> = {
      want_to_read: 0,
      currently_reading: 0,
      finished: 0,
      dnf: 0,
      up_next: 0,
      paused: 0,
    };
    
    for (const ub of allUserBooks) {
      const status = ub.status as ReadingStatus;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    }

    const defaultShelves: ShelfData[] = [];
    const customShelves: ShelfData[] = [];

    for (const shelf of shelves) {
      const shelfData: ShelfData = {
        id: shelf.id,
        name: shelf.name,
        type: shelf.type as "default" | "custom",
        bookCount:
          shelf.type === "default" && shelf.status
            ? statusCounts[shelf.status as ReadingStatus] ?? 0
            : 0,
        status: shelf.status,
      };

      if (shelf.type === "default") {
        defaultShelves.push(shelfData);
      } else {
        customShelves.push(shelfData);
      }
    }

    // ========================================================================
    // Step 6: Process reading goals with progress calculation
    // ========================================================================
    const FREE_TIER_GOAL_LIMIT = 3;
    const PREMIUM_TIER_GOAL_LIMIT = 12;
    const subscriptionTier = profile?.subscription_tier as "free" | "bibliophile" | undefined;
    const goalLimit = subscriptionTier === "bibliophile" ? PREMIUM_TIER_GOAL_LIMIT : FREE_TIER_GOAL_LIMIT;
    
    // Filter active and achieved goals
    const activeDbGoals = allGoals.filter((g) => {
      const status = (g as { status?: string }).status;
      return g.is_active && (!status || status === "active");
    });
    
    const achievedDbGoals = allGoals.filter((g) => {
      const status = (g as { status?: string }).status;
      return status === "completed";
    });

    // Calculate progress for goals using finished books we already fetched
    const currentYear = new Date().getFullYear();
    const finishedBooksThisYear = finishedBooks.filter((fb) => {
      if (!fb.date_finished) return false;
      const year = new Date(fb.date_finished).getFullYear();
      return year === currentYear;
    });

    // We need book details for pages/diversity goals
    let bookDetailsMap: Map<string, { page_count: number | null; subjects: string[] | null }> = new Map();
    const needsBookDetails = allGoals.some((g) => g.type === "pages" || g.type === "diversity");
    
    if (needsBookDetails && finishedBooksThisYear.length > 0) {
      const bookIds = finishedBooksThisYear.map((fb) => fb.book_id);
      const { data: booksData } = await supabase
        .from("books")
        .select("id, page_count, subjects")
        .in("id", bookIds);
      
      if (booksData) {
        bookDetailsMap = new Map(booksData.map((b) => [b.id, { page_count: b.page_count, subjects: b.subjects }]));
      }
    }

    // Helper to calculate goal progress
    function calculateGoalProgress(goal: DBReadingGoal): number {
      const config = (goal.config as Record<string, unknown>) || {};
      const goalYear = (config.year as number) || currentYear;
      
      // Get date range for this goal
      let dateStart: string;
      let dateEnd: string;
      
      if (goal.type === "books") {
        const periodMonths = config.period_months as number | undefined;
        const startDateStr = config.start_date as string | undefined;
        const endDateStr = config.end_date as string | undefined;

        if (startDateStr && endDateStr) {
          dateStart = new Date(startDateStr).toISOString().split("T")[0];
          dateEnd = new Date(endDateStr).toISOString().split("T")[0];
        } else if (periodMonths && startDateStr) {
          dateStart = new Date(startDateStr).toISOString().split("T")[0];
          const startDate = new Date(startDateStr);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + periodMonths);
          dateEnd = endDate.toISOString().split("T")[0];
        } else if (periodMonths) {
          const now = new Date();
          dateStart = now.toISOString().split("T")[0];
          const endDate = new Date(now);
          endDate.setMonth(endDate.getMonth() + periodMonths);
          dateEnd = endDate.toISOString().split("T")[0];
        } else {
          dateStart = new Date(goalYear, 0, 1).toISOString().split("T")[0];
          dateEnd = new Date(goalYear, 11, 31).toISOString().split("T")[0];
        }
      } else {
        dateStart = new Date(goalYear, 0, 1).toISOString().split("T")[0];
        dateEnd = new Date(goalYear, 11, 31).toISOString().split("T")[0];
      }

      // Filter books to this goal's date range
      const booksInRange = finishedBooksThisYear.filter((fb) => {
        if (!fb.date_finished) return false;
        const dateOnly = fb.date_finished.split("T")[0];
        return dateOnly >= dateStart && dateOnly <= dateEnd;
      });

      switch (goal.type) {
        case "books":
          return booksInRange.length;

        case "pages":
          return booksInRange.reduce((sum, fb) => {
            const bookInfo = bookDetailsMap.get(fb.book_id);
            return sum + (bookInfo?.page_count || 0);
          }, 0);

        case "diversity": {
          const selectedGenres = (config.genres as string[]) || [];
          const allGenres = new Set<string>();
          booksInRange.forEach((fb) => {
            const bookInfo = bookDetailsMap.get(fb.book_id);
            (bookInfo?.subjects || []).forEach((genre: string) => {
              if (selectedGenres.length === 0 || selectedGenres.includes(genre)) {
                allGenres.add(genre);
              }
            });
          });
          return allGenres.size;
        }

        case "consistency": {
          const uniqueDays = new Set<string>();
          booksInRange.forEach((fb) => {
            if (fb.date_finished) {
              uniqueDays.add(fb.date_finished.split("T")[0]);
            }
          });
          return uniqueDays.size;
        }

        default:
          return 0;
      }
    }

    // Convert goals to component format with calculated progress
    const activeGoals: ReadingGoal[] = activeDbGoals.map((goal) => {
      const componentGoal = dbGoalToComponentGoal(goal);
      componentGoal.current = calculateGoalProgress(goal);
      return componentGoal;
    });

    const achievedGoals: ReadingGoal[] = achievedDbGoals.map((goal) => {
      const componentGoal = dbGoalToComponentGoal(goal);
      componentGoal.current = calculateGoalProgress(goal);
      return componentGoal;
    });

    const activeGoalCount = activeDbGoals.length;
    const canCreateGoal = activeGoalCount < goalLimit;

    // ========================================================================
    // Step 7: Calculate Quick Insights (for AdvancedInsights component)
    // ========================================================================
    
    // Calculate avg pages per day from last 30 days sessions
    // Use total days in period (30) as denominator for accurate daily average
    const totalPagesInLast30Days = recentSessions.reduce(
      (sum, session) => sum + (session.pages_read || 0),
      0
    );
    // 30 days is the fixed period for this calculation
    const insightAvgPagesPerDay =
      totalPagesInLast30Days > 0 ? Math.round(totalPagesInLast30Days / 30) : 0;

    // Get top genre from finished books with subjects
    const genreCountMap = new Map<string, number>();
    for (const ub of moodBooks) {
      if (ub.status === "finished" && ub.subjects) {
        const subjects = ub.subjects as string[];
        for (const subject of subjects) {
          if (typeof subject === "string" && subject.trim() !== "") {
            genreCountMap.set(subject, (genreCountMap.get(subject) || 0) + 1);
          }
        }
      }
    }
    let topGenre: string | null = null;
    if (genreCountMap.size > 0) {
      const sortedGenres = Array.from(genreCountMap.entries()).sort(
        (a, b) => b[1] - a[1]
      );
      topGenre = sortedGenres[0][0];
    }

    const quickInsights: QuickInsightsData = {
      avgPagesPerDay: insightAvgPagesPerDay,
      currentStreak: readingStreak,
      topGenre,
    };

    // ========================================================================
    // Step 8: Calculate Mood Summary (for MoodTracker component)
    // ========================================================================
    
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

    // Filter books for mood tracking:
    // - Last 10 finished books with rating >= 4
    // - All currently reading books
    const finishedMoodBooks = moodBooks
      .filter((ub) => ub.status === "finished" && (ub.rating ?? 0) >= 4)
      .slice(0, 10);
    const currentlyReadingMoodBooks = moodBooks.filter(
      (ub) => ub.status === "currently_reading"
    );
    const combinedMoodBooks = [...finishedMoodBooks, ...currentlyReadingMoodBooks];

    let booksWithMoods = 0;
    const moodsMap = new Map<string, number>();
    const pacingMap = new Map<string, number>();

    for (const userBook of combinedMoodBooks) {
      const reviewAttrs = userBook.review_attributes as Record<string, unknown> | null;
      if (!reviewAttrs) continue;

      // Extract moods
      const moods = reviewAttrs.moods;
      if (Array.isArray(moods) && moods.length > 0) {
        booksWithMoods++;
        for (const mood of moods) {
          if (typeof mood === "string" && mood.trim() !== "") {
            moodsMap.set(mood, (moodsMap.get(mood) || 0) + 1);
          }
        }
      }

      // Extract pacing
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

    // Check if at least 3 books have mood tags
    const hasEnoughMoodData = booksWithMoods >= 3;

    // Get top 4 moods
    const topMoods = hasEnoughMoodData
      ? Array.from(moodsMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([mood]) => ({
            mood,
            color: getMoodColor(mood),
          }))
      : [];

    // Get most frequent pacing
    let mostFrequentPacing: string | null = null;
    if (pacingMap.size > 0) {
      const pacingEntries = Array.from(pacingMap.entries());
      pacingEntries.sort((a, b) => b[1] - a[1]);
      mostFrequentPacing = pacingEntries[0][0];
    }

    const moodSummary: MoodSummaryData = {
      hasEnoughData: hasEnoughMoodData,
      moods: topMoods,
      pacing: mostFrequentPacing,
    };

    const totalTime = totalTimer.end();

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      currentlyReading: booksWithProgress,
      stats: {
        booksRead: finishedBooks.length,
        pagesRead,
        readingStreak,
        avgPagesPerDay,
      },
      shelves: {
        default: defaultShelves,
        custom: customShelves,
      },
      goals: {
        activeGoals,
        achievedGoals,
        canCreate: canCreateGoal,
        currentCount: activeGoalCount,
        limit: goalLimit,
      },
      insights: quickInsights,
      moodSummary,
      timing: {
        total: totalTime,
        auth: authTime,
        queries: queryTime,
      },
    };
  } catch (error) {
    totalTimer.end();
    console.error("Dashboard data error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load dashboard",
    };
  }
});

// ============================================================================
// Lightweight refresh functions (for after mutations)
// ============================================================================

/**
 * Refresh just the currently reading books (lighter than full dashboard refresh)
 */
export async function refreshCurrentlyReading(): Promise<{
  success: boolean;
  books?: BookWithProgress[];
  error?: string;
}> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data: userBooks } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "currently_reading")
      .order("date_added", { ascending: false });

    if (!userBooks || userBooks.length === 0) {
      return { success: true, books: [] };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    const [booksResult, progressResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
    ]);

    const progressMap: Record<string, ReadingProgress> = {};
    for (const p of progressResult.data || []) {
      progressMap[p.book_id] = p;
    }

    const books = userBooks
      .map((ub) => {
        const book = booksResult.data?.find((b) => b.id === ub.book_id);
        if (!book) return null;
        return {
          ...book,
          progress: progressMap[ub.book_id],
          userBook: ub,
        };
      })
      .filter((b): b is BookWithProgress => b !== null);

    return { success: true, books };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh",
    };
  }
}

/**
 * Refresh just the shelves (lighter than full dashboard refresh)
 */
export async function refreshShelves(): Promise<{
  success: boolean;
  shelves?: { default: ShelfData[]; custom: ShelfData[] };
  error?: string;
}> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const [shelvesResult, userBooksResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("user_books").select("status").eq("user_id", user.id),
    ]);

    const shelves = shelvesResult.data || [];
    const userBooks = userBooksResult.data || [];

    const statusCounts: Record<ReadingStatus, number> = {
      want_to_read: 0,
      currently_reading: 0,
      finished: 0,
      dnf: 0,
      up_next: 0,
      paused: 0,
    };

    for (const ub of userBooks) {
      const status = ub.status as ReadingStatus;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    }

    const defaultShelves: ShelfData[] = [];
    const customShelves: ShelfData[] = [];

    for (const shelf of shelves) {
      const shelfData: ShelfData = {
        id: shelf.id,
        name: shelf.name,
        type: shelf.type as "default" | "custom",
        bookCount:
          shelf.type === "default" && shelf.status
            ? statusCounts[shelf.status as ReadingStatus] ?? 0
            : 0,
        status: shelf.status,
      };

      if (shelf.type === "default") {
        defaultShelves.push(shelfData);
      } else {
        customShelves.push(shelfData);
      }
    }

    return { success: true, shelves: { default: defaultShelves, custom: customShelves } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh",
    };
  }
}

