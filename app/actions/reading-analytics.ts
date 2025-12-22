"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export interface WeeklyData {
  day: string;
  pages: number;
}

export interface ReadingAnalyticsResult {
  success: true;
  pagesReadToday: number;
  dailyGoal: number;
  averagePagesPerDay: number;
  weeklyData: WeeklyData[];
  totalReadingTime: string; // Formatted as "Xh Ym"
}

export interface ReadingAnalyticsError {
  success: false;
  error: string;
}

/**
 * Get reading analytics for a specific book
 */
export async function getReadingAnalytics(
  bookId: string
): Promise<ReadingAnalyticsResult | ReadingAnalyticsError> {
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

    // Get reading progress
    const { data: progress, error: progressError } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    // Get user's daily goal
    const { data: profile } = await supabase
      .from("profiles")
      .select("daily_reading_goal")
      .eq("id", user.id)
      .single();

    const dailyGoal = profile?.daily_reading_goal || 40;

    if (progressError || !progress) {
      // Return default values if no progress exists
      return {
        success: true,
        pagesReadToday: 0,
        dailyGoal,
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
    }

    // Get reading sessions for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sessions, error: sessionsError } = await supabase
      .from("reading_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .gte("session_date", sevenDaysAgo.toISOString().split("T")[0])
      .order("session_date", { ascending: true });

    if (sessionsError) {
      console.error("Error fetching reading sessions:", sessionsError);
    }

    // Calculate today's pages
    const today = new Date().toISOString().split("T")[0];
    const todaySessions = (sessions || []).filter(
      (s) => s.session_date === today
    );
    const pagesReadToday = todaySessions.reduce(
      (sum, s) => sum + (s.pages_read || 0),
      0
    );

    // Calculate average pages per day
    const startDate = new Date(progress.started_at);
    const daysSinceStart = Math.max(
      1,
      Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const averagePagesPerDay = Math.round(progress.pages_read / daysSinceStart);

    // Build weekly data
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData: WeeklyData[] = dayNames.map((day) => ({ day, pages: 0 }));

    // Group sessions by day of week
    (sessions || []).forEach((session) => {
      const sessionDate = new Date(session.session_date);
      const dayIndex = sessionDate.getDay();
      weeklyData[dayIndex].pages += session.pages_read || 0;
    });

    // Reorder to start with Monday
    const reorderedWeeklyData = [
      weeklyData[1], // Mon
      weeklyData[2], // Tue
      weeklyData[3], // Wed
      weeklyData[4], // Thu
      weeklyData[5], // Fri
      weeklyData[6], // Sat
      weeklyData[0], // Sun
    ];

    // Calculate total reading time (sum of all session durations)
    const totalMinutes = (sessions || []).reduce(
      (sum, s) => sum + (s.duration_minutes || 0),
      0
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const totalReadingTime = `${hours}h ${minutes}m`;

    return {
      success: true,
      pagesReadToday,
      dailyGoal,
      averagePagesPerDay,
      weeklyData: reorderedWeeklyData,
      totalReadingTime,
    };
  } catch (error) {
    console.error("Get reading analytics error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


