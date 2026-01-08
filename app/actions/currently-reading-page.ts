"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

import { getBookDetail } from "./book-detail";
import { getVelocityStats } from "./insights";
import { getJournalEntries, type JournalEntryType } from "./journal-actions";
import { getReadingAnalytics } from "./reading-analytics";
import { getUpNextQueue } from "./up-next";

export interface CurrentlyReadingPageData {
  book: {
    id: string;
    title: string;
    author: string;
    cover: string;
    totalPages: number;
    pagesRead: number;
    startDate: string;
    format: string;
    moods: string[];
    pace: string;
    aggregate_rating: number | null;
    ratings_count: number | null;
    common_moods: string[] | null;
    global_pacing: string | null;
    global_difficulty: string | null;
  };
  journalEntries: Array<{
    id: string;
    type: JournalEntryType;
    content: string;
    page?: number;
    createdAt: string;
  }>;
  analytics: {
    pagesReadToday: number;
    dailyGoal: number;
    averagePagesPerDay: number;
    weeklyData: { day: string; pages: number }[];
    totalReadingTime: string;
  };
  velocityStats: {
    currentStreak: number;
    bestStreak: number;
  };
  upNextBooks: Array<{
    id: string;
    title: string;
    author: string;
    cover: string;
  }>;
}

export interface CurrentlyReadingPageResult {
  success: true;
  data: CurrentlyReadingPageData;
}

export interface CurrentlyReadingPageError {
  success: false;
  error: string;
}

/**
 * Fetch all data needed for the currently reading detail page
 * Runs on the server for fast initial load
 */
export async function getCurrentlyReadingPageData(
  bookId: string
): Promise<CurrentlyReadingPageResult | CurrentlyReadingPageError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Quick auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Fetch book detail first (required)
    const bookResult = await getBookDetail(bookId);
    if (!bookResult.success) {
      return { success: false, error: bookResult.error };
    }

    // Fetch all other data in parallel
    const [journalResult, analyticsResult, velocityResult, upNextResult] =
      await Promise.all([
        getJournalEntries(bookId),
        getReadingAnalytics(bookId),
        getVelocityStats(),
        getUpNextQueue(),
      ]);

    const bookData = bookResult.book;
    const progress = bookData.progress;
    const startDate = progress?.started_at
      ? new Date(progress.started_at)
      : new Date(bookData.userBook?.date_added || Date.now());

    // Transform book data
    const book: CurrentlyReadingPageData["book"] = {
      id: bookData.id,
      title: bookData.title,
      author: bookData.authors?.join(", ") || "Unknown Author",
      cover:
        bookData.cover_url_medium ||
        bookData.cover_url_large ||
        bookData.cover_url_small ||
        "",
      totalPages: bookData.page_count || 0,
      pagesRead: progress?.pages_read || 0,
      startDate: startDate.toISOString(),
      format: bookData.userBook?.reading_format || "physical",
      moods: bookData.subjects?.slice(0, 3) || [],
      pace: "Medium-paced",
      aggregate_rating: bookData.aggregate_rating ?? null,
      ratings_count: bookData.ratings_count ?? null,
      common_moods: bookData.common_moods ?? null,
      global_pacing: bookData.global_pacing ?? null,
      global_difficulty: bookData.global_difficulty ?? null,
    };

    // Transform journal entries
    const journalEntries = journalResult.success
      ? journalResult.entries.map((entry) => ({
          id: entry.id,
          type: entry.type,
          content: entry.content,
          page: entry.page,
          createdAt: entry.createdAt.toISOString(),
        }))
      : [];

    // Transform analytics
    const analytics: CurrentlyReadingPageData["analytics"] =
      analyticsResult.success
        ? {
            pagesReadToday: analyticsResult.pagesReadToday,
            dailyGoal: analyticsResult.dailyGoal,
            averagePagesPerDay: analyticsResult.averagePagesPerDay,
            weeklyData: analyticsResult.weeklyData,
            totalReadingTime: analyticsResult.totalReadingTime,
          }
        : {
            pagesReadToday: 0,
            dailyGoal: 40,
            averagePagesPerDay: 0,
            weeklyData: [
              { day: "Mon", pages: 0 },
              { day: "Tue", pages: 0 },
              { day: "Wed", pages: 0 },
              { day: "Thu", pages: 0 },
              { day: "Fri", pages: 0 },
              { day: "Sat", pages: 0 },
              { day: "Sun", pages: 0 },
            ],
            totalReadingTime: "0h 0m",
          };

    // Transform velocity stats
    const velocityStats: CurrentlyReadingPageData["velocityStats"] =
      velocityResult.success
        ? {
            currentStreak: velocityResult.currentStreak,
            bestStreak: velocityResult.bestStreak,
          }
        : { currentStreak: 0, bestStreak: 0 };

    // Transform up next books
    const upNextBooks: CurrentlyReadingPageData["upNextBooks"] =
      upNextResult.success
        ? upNextResult.books.map((b) => ({
            id: b.id,
            title: b.title,
            author: b.authors?.join(", ") || "Unknown Author",
            cover:
              b.cover_url_medium ||
              b.cover_url_large ||
              b.cover_url_small ||
              "",
          }))
        : [];

    return {
      success: true,
      data: {
        book,
        journalEntries,
        analytics,
        velocityStats,
        upNextBooks,
      },
    };
  } catch (error) {
    console.error("Error fetching currently reading page data:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
