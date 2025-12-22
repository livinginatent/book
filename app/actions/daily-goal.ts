"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export interface DailyGoalResult {
  success: true;
  dailyGoal: number;
}

export interface DailyGoalError {
  success: false;
  error: string;
}

/**
 * Get user's daily reading goal
 */
export async function getDailyGoal(): Promise<
  DailyGoalResult | DailyGoalError
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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("daily_reading_goal")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching daily goal:", error);
      return { success: false, error: "Failed to fetch daily goal" };
    }

    return {
      success: true,
      dailyGoal: profile?.daily_reading_goal || 40, // Default to 40 if null
    };
  } catch (error) {
    console.error("Get daily goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update user's daily reading goal
 */
export async function updateDailyGoal(
  goal: number
): Promise<DailyGoalResult | DailyGoalError> {
  try {
    if (goal < 1 || goal > 1000) {
      return {
        success: false,
        error: "Daily goal must be between 1 and 1000 pages",
      };
    }

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

    const { error } = await supabase
      .from("profiles")
      .update({ daily_reading_goal: goal })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating daily goal:", error);
      return { success: false, error: "Failed to update daily goal" };
    }

    return {
      success: true,
      dailyGoal: goal,
    };
  } catch (error) {
    console.error("Update daily goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

