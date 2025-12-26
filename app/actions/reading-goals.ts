"use server";

import { cookies } from "next/headers";

import {
  componentGoalToDbGoal,
  dbGoalToComponentGoal,
} from "@/lib/goal-wizard/goal-converters";
import { createClient } from "@/lib/supabase/server";
import type {
  GoalType,
  ReadingGoal as DBReadingGoal,
  SubscriptionTier,
} from "@/types/database.types";
import type { ReadingGoal } from "@/types/user.type";

export type GoalWizardType = GoalType;

export interface AvailableGoalTypesResult {
  success: true;
  types: GoalWizardType[];
  subscriptionTier: SubscriptionTier;
}

export interface ReadingGoalResult {
  success: true;
  goal: ReadingGoal;
}

export interface DBReadingGoalResult {
  success: true;
  goal: DBReadingGoal;
}

export interface ReadingGoalError {
  success: false;
  error: string;
}

const FREE_TIER_TYPES: GoalWizardType[] = ["books"];
const PREMIUM_TIER_TYPES: GoalWizardType[] = [
  "books",
  "pages",
  "diversity",
  "consistency",
];

// Multi-goal system limits
const FREE_TIER_GOAL_LIMIT = 3; // Bookworm users can have 3 active goals
const PREMIUM_TIER_GOAL_LIMIT = 12; // Bibliophile users can have 12 active goals

/**
 * Resolve the subscription tier for a given user ID.
 * Accepts userId directly to avoid redundant getUser() calls.
 */
async function getUserSubscriptionTier(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<SubscriptionTier> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching subscription tier:", error);
    return "free";
  }

  return (profile?.subscription_tier as SubscriptionTier | null) ?? "free";
}

/**
 * Check if a user can create a new active goal based on their subscription tier limit.
 *
 * @param userId - The user's ID
 * @param subscriptionTier - Optional subscription tier (if already known from frontend)
 * @returns Object with canCreate boolean and current count, or error
 */
export async function canCreateGoal(
  userId: string,
  subscriptionTier?: SubscriptionTier
): Promise<
  | { success: true; canCreate: boolean; currentCount: number; limit: number }
  | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // If tier not provided, fetch it (otherwise use the provided value)
    let tier = subscriptionTier;
    if (!tier) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Default to free tier on error
        tier = "free";
      } else {
        tier =
          (profile?.subscription_tier as SubscriptionTier | null) ?? "free";
      }
    }

    const limit =
      tier === "bibliophile" ? PREMIUM_TIER_GOAL_LIMIT : FREE_TIER_GOAL_LIMIT;

    // Count active goals for this user
    const { count, error: countError } = await supabase
      .from("reading_goals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    if (countError) {
      console.error("Error counting active goals:", countError);
      return {
        success: false,
        error: "Failed to count active goals",
      };
    }

    const currentCount = count || 0;
    const canCreate = currentCount < limit;

    return {
      success: true,
      canCreate,
      currentCount,
      limit,
    };
  } catch (error) {
    console.error("Can create goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get which goal types are available to the current user based on their tier.
 *
 * - Bookworm (free): ["books"]
 * - Bibliophile (premium): ["books", "pages", "diversity", "consistency"]
 */
export async function getAvailableGoalTypes(): Promise<
  AvailableGoalTypesResult | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Ensure user is logged in
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const tier = await getUserSubscriptionTier(supabase, user.id);

    const types = tier === "bibliophile" ? PREMIUM_TIER_TYPES : FREE_TIER_TYPES;

    return {
      success: true,
      types,
      subscriptionTier: tier,
    };
  } catch (error) {
    console.error("Get available goal types error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create or update the user's active goal with a selected type.
 *
 * This is the main action for Step 1 of the goal wizard:
 * choosing between books / pages / diversity / consistency.
 *
 * For premium-only types, enforces that the user is on the Bibliophile tier.
 * Detailed configuration (targets, genres, etc.) can be supplied later via `config`.
 */
export async function upsertGoalType(
  type: GoalWizardType,
  config: Record<string, unknown> = {}
): Promise<ReadingGoalResult | ReadingGoalError> {
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

    const tier = await getUserSubscriptionTier(supabase, user.id);

    const isPremiumType =
      type === "pages" || type === "diversity" || type === "consistency";

    if (isPremiumType && tier !== "bibliophile") {
      return {
        success: false,
        error:
          "This goal type is available only to Bibliophile (premium) subscribers.",
      };
    }

    // Deactivate any existing active goals for this user
    // Set status to 'archived' if the column exists
    const { error: deactivateError } = await supabase
      .from("reading_goals")
      .update({
        is_active: false,
        // Try to set status to 'archived' if column exists (will be ignored if it doesn't)
        status: "archived" as any,
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating existing goals:", deactivateError);
    }

    // Create a new active goal
    // Set status to 'active' if the column exists
    const { data: goal, error: insertError } = await supabase
      .from("reading_goals")
      .insert({
        user_id: user.id,
        type,
        is_active: true,
        config,
        // Try to set status to 'active' if column exists (will be ignored if it doesn't)
        status: "active" as any,
      })
      .select("*")
      .single();

    if (insertError || !goal) {
      console.error("Error creating reading goal:", insertError);
      return { success: false, error: "Failed to create reading goal" };
    }

    return {
      success: true,
      goal: dbGoalToComponentGoal(goal),
    };
  } catch (error) {
    console.error("Upsert goal type error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Helper to get date range for a goal
 */
function getGoalDateRange(
  goalType: GoalType,
  goalYear: number,
  goalConfig: Record<string, unknown>
): { dateStart: string; dateEnd: string } {
  let dateStart: string;
  let dateEnd: string;

  if (goalType === "books") {
    const periodMonths = goalConfig.period_months as number | undefined;
    const startDateStr = goalConfig.start_date as string | undefined;
    const endDateStr = goalConfig.end_date as string | undefined;

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
      dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999)
        .toISOString()
        .split("T")[0];
    }
  } else {
    dateStart = new Date(goalYear, 0, 1).toISOString().split("T")[0];
    dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999)
      .toISOString()
      .split("T")[0];
  }

  return { dateStart, dateEnd };
}

/**
 * Batch calculate progress for multiple goals using a single set of queries.
 * This avoids N+1 queries by fetching all user_books once and calculating in memory.
 */
async function batchCalculateGoalProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goals: DBReadingGoal[]
): Promise<Map<string, number>> {
  const progressMap = new Map<string, number>();

  if (goals.length === 0) {
    return progressMap;
  }

  // Get the widest date range needed (full year for simplicity)
  const currentYear = new Date().getFullYear();
  const yearStart = new Date(currentYear, 0, 1).toISOString().split("T")[0];
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)
    .toISOString()
    .split("T")[0];

  // Fetch all finished user_books for this user in the current year - SINGLE QUERY
  const { data: finishedBooks, error: booksError } = await supabase
    .from("user_books")
    .select("book_id, date_finished")
    .eq("user_id", userId)
    .eq("status", "finished")
    .gte("date_finished", yearStart)
    .lte("date_finished", yearEnd);

  if (booksError) {
    console.error("Error fetching finished books:", booksError);
    // Return 0 for all goals
    goals.forEach((g) => progressMap.set(g.id, 0));
    return progressMap;
  }

  const allFinishedBooks = finishedBooks || [];
  const allBookIds = allFinishedBooks.map((ub) => ub.book_id);

  // Fetch book details only if needed (for pages/diversity goals)
  let booksData: {
    id: string;
    page_count: number | null;
    subjects: string[] | null;
  }[] = [];
  const needsBookDetails = goals.some(
    (g) => g.type === "pages" || g.type === "diversity"
  );

  if (needsBookDetails && allBookIds.length > 0) {
    const { data, error } = await supabase
      .from("books")
      .select("id, page_count, subjects")
      .in("id", allBookIds);

    if (!error && data) {
      booksData = data;
    }
  }

  // Create lookup map for book data
  const bookDataMap = new Map(booksData.map((b) => [b.id, b]));

  // Calculate progress for each goal
  for (const goal of goals) {
    const config = (goal.config as Record<string, unknown>) || {};
    const goalYear = (config.year as number) || currentYear;
    const { dateStart, dateEnd } = getGoalDateRange(
      goal.type,
      goalYear,
      config
    );

    // Filter books to this goal's date range
    const booksInRange = allFinishedBooks.filter((ub) => {
      if (!ub.date_finished) return false;
      const dateOnly = ub.date_finished.split("T")[0];
      return dateOnly >= dateStart && dateOnly <= dateEnd;
    });

    let progress = 0;

    switch (goal.type) {
      case "books":
        progress = booksInRange.length;
        break;

      case "pages":
        progress = booksInRange.reduce((sum, ub) => {
          const bookInfo = bookDataMap.get(ub.book_id);
          return sum + (bookInfo?.page_count || 0);
        }, 0);
        break;

      case "diversity": {
        const selectedGenres = (config.genres as string[]) || [];
        const allGenres = new Set<string>();

        booksInRange.forEach((ub) => {
          const bookInfo = bookDataMap.get(ub.book_id);
          (bookInfo?.subjects || []).forEach((genre: string) => {
            if (selectedGenres.length === 0 || selectedGenres.includes(genre)) {
              allGenres.add(genre);
            }
          });
        });

        progress = allGenres.size;
        break;
      }

      case "consistency": {
        const uniqueDays = new Set<string>();
        booksInRange.forEach((ub) => {
          if (ub.date_finished) {
            uniqueDays.add(ub.date_finished.split("T")[0]);
          }
        });
        progress = uniqueDays.size;
        break;
      }
    }

    progressMap.set(goal.id, progress);
  }

  return progressMap;
}

/**
 * Calculate goal progress from user_books table based on goal type
 * (Single goal version - used for individual goal fetches)
 */
async function calculateGoalProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  goalType: GoalType,
  goalYear: number,
  goalConfig: Record<string, unknown>
): Promise<number> {
  const { dateStart, dateEnd } = getGoalDateRange(
    goalType,
    goalYear,
    goalConfig
  );

  switch (goalType) {
    case "books": {
      const { count, error } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("date_finished", dateStart)
        .lte("date_finished", dateEnd);

      if (error) {
        console.error("Error calculating books progress:", error);
        return 0;
      }
      return count || 0;
    }

    case "pages": {
      const { data: finishedBooks, error } = await supabase
        .from("user_books")
        .select("book_id")
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("date_finished", dateStart)
        .lte("date_finished", dateEnd);

      if (error || !finishedBooks || finishedBooks.length === 0) {
        return 0;
      }

      const bookIds = finishedBooks.map((ub) => ub.book_id);
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("page_count")
        .in("id", bookIds);

      if (booksError) {
        console.error(
          "Error fetching books for pages calculation:",
          booksError
        );
        return 0;
      }

      return (books || []).reduce(
        (sum, book) => sum + (book.page_count || 0),
        0
      );
    }

    case "diversity": {
      const selectedGenres = (goalConfig.genres as string[]) || [];

      const { data: finishedBooks, error } = await supabase
        .from("user_books")
        .select("book_id")
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("date_finished", dateStart)
        .lte("date_finished", dateEnd);

      if (error || !finishedBooks || finishedBooks.length === 0) {
        return 0;
      }

      const bookIds = finishedBooks.map((ub) => ub.book_id);
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("subjects")
        .in("id", bookIds);

      if (booksError) {
        console.error(
          "Error fetching books for genres calculation:",
          booksError
        );
        return 0;
      }

      const allGenres = new Set<string>();
      (books || []).forEach((book) => {
        (book.subjects || []).forEach((genre: string) => {
          if (selectedGenres.length === 0 || selectedGenres.includes(genre)) {
            allGenres.add(genre);
          }
        });
      });

      return allGenres.size;
    }

    case "consistency": {
      const { data: finishedBooks, error } = await supabase
        .from("user_books")
        .select("date_finished")
        .eq("user_id", userId)
        .eq("status", "finished")
        .gte("date_finished", dateStart)
        .lte("date_finished", dateEnd)
        .not("date_finished", "is", null);

      if (error || !finishedBooks || finishedBooks.length === 0) {
        return 0;
      }

      const uniqueDays = new Set<string>();
      finishedBooks.forEach((ub) => {
        if (ub.date_finished) {
          uniqueDays.add(ub.date_finished.split("T")[0]);
        }
      });

      return uniqueDays.size;
    }

    default:
      return 0;
  }
}

/**
 * Check if a goal is completed and mark it as such if needed.
 * This is called automatically when fetching goals.
 */
async function checkAndMarkGoalCompleted(
  supabase: ReturnType<typeof createClient>,
  goal: DBReadingGoal,
  currentProgress: number
): Promise<void> {
  const config = (goal.config as Record<string, unknown>) || {};
  const target = (config.target as number) || 0;
  const goalStatus = (goal as { status?: string }).status || "active";

  // Only check active goals
  if (goalStatus !== "active") {
    return;
  }

  // If goal is achieved, mark it as completed
  if (currentProgress >= target && target > 0) {
    try {
      // Use the database function to mark as completed
      const { error } = await supabase.rpc("mark_goal_completed", {
        goal_id: goal.id,
      });

      if (error) {
        console.error("Error marking goal as completed:", error);
      }
    } catch (error) {
      console.error("Error calling mark_goal_completed:", error);
    }
  }
}

/**
 * Get all active goals for the current user.
 * Automatically calculates progress from user_books table for each goal.
 * Uses batch calculation to minimize database queries.
 */
export async function getAllActiveGoals(): Promise<
  { success: true; goals: ReadingGoal[] } | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Fetch all active goals
    const { data: goals, error } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active goals:", error);
      return { success: false, error: "Failed to fetch active goals" };
    }

    if (!goals || goals.length === 0) {
      return { success: true, goals: [] };
    }

    // Batch calculate progress for all goals (2 queries instead of N*2)
    const progressMap = await batchCalculateGoalProgress(
      supabase,
      user.id,
      goals
    );

    // Convert to component goals with progress
    const goalsWithProgress = goals.map((goal) => {
      const componentGoal = dbGoalToComponentGoal(goal);
      componentGoal.current = progressMap.get(goal.id) || 0;

      // Check completion in background (non-blocking)
      const config = (goal.config as Record<string, unknown>) || {};
      const target = (config.target as number) || 0;
      if (componentGoal.current >= target && target > 0) {
        checkAndMarkGoalCompleted(supabase, goal, componentGoal.current).catch(
          (err) => console.error("Error checking goal completion:", err)
        );
      }

      return componentGoal;
    });

    // Filter out completed goals
    const activeGoals = goalsWithProgress.filter((goal) => {
      const originalGoal = goals.find((g) => g.id === goal.id);
      const status = (originalGoal as { status?: string })?.status;
      return !status || status === "active";
    });

    return {
      success: true,
      goals: activeGoals,
    };
  } catch (error) {
    console.error("Get all active goals error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get all achieved (completed) goals for the current user.
 * Uses batch calculation to minimize database queries.
 */
export async function getAllAchievedGoals(): Promise<
  { success: true; goals: ReadingGoal[] } | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Fetch all goals (we'll filter by status in memory)
    const { data: allGoals, error: goalsError } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
      return { success: false, error: "Failed to fetch goals" };
    }

    if (!allGoals || allGoals.length === 0) {
      return { success: true, goals: [] };
    }

    // Filter to completed goals first
    const hasStatusColumn = allGoals.length > 0 && "status" in allGoals[0];
    const goals = hasStatusColumn
      ? allGoals.filter(
          (g) => (g as { status?: string }).status === "completed"
        )
      : allGoals;

    if (goals.length === 0) {
      return { success: true, goals: [] };
    }

    // Batch calculate progress for all goals
    const progressMap = await batchCalculateGoalProgress(
      supabase,
      user.id,
      goals
    );

    // Convert to component goals with progress
    const goalsWithProgress = goals.map((goal) => {
      const componentGoal = dbGoalToComponentGoal(goal);
      componentGoal.current = progressMap.get(goal.id) || 0;
      return componentGoal;
    });

    // Filter for completed goals (status or current >= target)
    const achievedGoals = goalsWithProgress.filter((goal) => {
      const originalGoal = goals.find((g) => g.id === goal.id);
      const status = (originalGoal as { status?: string })?.status;

      if (status === "completed") {
        return true;
      }

      // Fallback: check if goal is achieved (for data before migration)
      if (!status && goal.current >= goal.target && goal.target > 0) {
        return true;
      }

      return false;
    });

    return {
      success: true,
      goals: achievedGoals,
    };
  } catch (error) {
    console.error("Get all achieved goals error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update a goal's config JSONB field.
 */
export async function updateGoalConfig(
  goalId: string,
  config: Record<string, unknown>
): Promise<ReadingGoalResult | ReadingGoalError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Verify the goal belongs to the user
    const { data: existingGoal, error: fetchError } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingGoal) {
      return {
        success: false,
        error: "Goal not found or access denied",
      };
    }

    // Merge with existing config to preserve other fields
    const existingConfig =
      (existingGoal.config as Record<string, unknown>) || {};
    const updatedConfig = { ...existingConfig, ...config };

    const { data: updatedGoal, error: updateError } = await supabase
      .from("reading_goals")
      .update({ config: updatedConfig })
      .eq("id", goalId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError || !updatedGoal) {
      console.error("Error updating goal config:", updateError);
      return { success: false, error: "Failed to update goal config" };
    }

    // Recalculate progress
    const goalConfig = (updatedGoal.config as Record<string, unknown>) || {};
    const goalYear = (goalConfig.year as number) || new Date().getFullYear();
    const currentProgress = await calculateGoalProgress(
      supabase,
      user.id,
      updatedGoal.type,
      goalYear,
      goalConfig
    );

    const componentGoal = dbGoalToComponentGoal(updatedGoal);
    componentGoal.current = currentProgress;

    return {
      success: true,
      goal: componentGoal,
    };
  } catch (error) {
    console.error("Update goal config error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get the user's current active goal, if any.
 * Automatically calculates progress from user_books table.
 */
export async function getActiveGoal(): Promise<
  ReadingGoalResult | { success: true; goal: null } | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: goal, error } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching active goal:", error);
      return { success: false, error: "Failed to fetch active goal" };
    }

    if (!goal) {
      return { success: true, goal: null };
    }

    // Calculate current progress from user_books
    const config = (goal.config as Record<string, unknown>) || {};
    const goalYear = (config.year as number) || new Date().getFullYear();
    const currentProgress = await calculateGoalProgress(
      supabase,
      user.id,
      goal.type,
      goalYear,
      config
    );

    // Convert to component format with calculated progress
    const componentGoal = dbGoalToComponentGoal(goal);
    componentGoal.current = currentProgress;

    return {
      success: true,
      goal: componentGoal,
    };
  } catch (error) {
    console.error("Get active goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create or update a reading goal with full configuration.
 * This is the main action called from the goal wizard.
 */
export async function saveReadingGoal(
  goal: Partial<ReadingGoal>
): Promise<ReadingGoalResult | ReadingGoalError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const tier = await getUserSubscriptionTier(supabase, user.id);

    // Map component type to DB type
    const componentType = goal.type || "books";
    const dbType = componentType === "genres" ? "diversity" : componentType;
    const isPremiumType =
      dbType === "pages" || dbType === "diversity" || dbType === "consistency";

    if (isPremiumType && tier !== "bibliophile") {
      return {
        success: false,
        error:
          "This goal type is available only to Bibliophile (premium) subscribers.",
      };
    }

    // Convert component goal to DB format
    const { type, config } = componentGoalToDbGoal(goal);

    // Deactivate any existing active goals for this user
    // Set status to 'archived' if the column exists, otherwise just set is_active = false
    const { error: deactivateError } = await supabase
      .from("reading_goals")
      .update({
        is_active: false,
        // Try to set status to 'archived' if column exists (will be ignored if it doesn't)
        status: "archived" as any,
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating existing goals:", deactivateError);
    }

    // Create a new active goal
    // Set status to 'active' if the column exists, otherwise just set is_active = true
    const { data: dbGoal, error: insertError } = await supabase
      .from("reading_goals")
      .insert({
        user_id: user.id,
        type: type as GoalType,
        is_active: true,
        config,
        // Try to set status to 'active' if column exists (will be ignored if it doesn't)
        status: "active" as any,
      })
      .select("*")
      .single();

    if (insertError || !dbGoal) {
      console.error("Error creating reading goal:", insertError);
      return { success: false, error: "Failed to create reading goal" };
    }

    return {
      success: true,
      goal: dbGoalToComponentGoal(dbGoal),
    };
  } catch (error) {
    console.error("Save reading goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update the progress (current value) of the user's active goal.
 * NOTE: Progress is now automatically calculated from user_books.
 * This function is kept for backward compatibility but recalculates from the database.
 */
export async function updateGoalProgress(
  _newCurrent: number // Parameter kept for API compatibility but ignored
): Promise<
  ReadingGoalResult | ReadingGoalError | { success: true; goal: null }
> {
  // Simply refresh the goal - progress is calculated automatically
  return getActiveGoal();
}

/**
 * Create a new reading goal.
 * Checks the user's goal limit before creating.
 *
 * @param goalData - Partial goal data including type and config
 * @returns The created goal or an error
 */
export async function createReadingGoal(goalData: {
  type: GoalType;
  config: Record<string, unknown>;
  isActive?: boolean;
}): Promise<ReadingGoalResult | ReadingGoalError> {
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

    // Check if user can create a new goal
    const canCreateResult = await canCreateGoal(user.id);
    if (!canCreateResult.success) {
      return canCreateResult;
    }

    if (!canCreateResult.canCreate) {
      return {
        success: false,
        error: `You have reached your goal limit of ${canCreateResult.limit} active goals. Please deactivate an existing goal or upgrade to Bibliophile for more goals.`,
      };
    }

    // Verify tier allows this goal type
    const tier = await getUserSubscriptionTier(supabase, user.id);
    const isPremiumType =
      goalData.type === "pages" ||
      goalData.type === "diversity" ||
      goalData.type === "consistency";

    if (isPremiumType && tier !== "bibliophile") {
      return {
        success: false,
        error:
          "This goal type is available only to Bibliophile (premium) subscribers.",
      };
    }

    // Insert new goal (ID will be auto-generated by gen_random_uuid() default)
    const { data: dbGoal, error: insertError } = await supabase
      .from("reading_goals")
      .insert({
        user_id: user.id,
        type: goalData.type,
        is_active: goalData.isActive ?? true,
        config: goalData.config,
      })
      .select("*")
      .single();

    if (insertError || !dbGoal) {
      console.error("Error creating reading goal:", insertError);
      return { success: false, error: "Failed to create reading goal" };
    }

    return {
      success: true,
      goal: dbGoalToComponentGoal(dbGoal),
    };
  } catch (error) {
    console.error("Create reading goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Increase the target of the user's active goal.
 */
export async function increaseGoalTarget(
  additionalAmount: number = 10
): Promise<ReadingGoalResult | ReadingGoalError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get the active goal
    const { data: dbGoal, error: fetchError } = await supabase
      .from("reading_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !dbGoal) {
      return {
        success: false,
        error: "No active goal found",
      };
    }

    // Update the config with increased target
    const config = (dbGoal.config as Record<string, unknown>) || {};
    const currentTarget = (config.target as number) || 0;
    const updatedConfig = {
      ...config,
      target: currentTarget + additionalAmount,
    };

    const { data: updatedGoal, error: updateError } = await supabase
      .from("reading_goals")
      .update({ config: updatedConfig })
      .eq("id", dbGoal.id)
      .select("*")
      .single();

    if (updateError || !updatedGoal) {
      console.error("Error increasing goal target:", updateError);
      return { success: false, error: "Failed to increase goal target" };
    }

    return {
      success: true,
      goal: dbGoalToComponentGoal(updatedGoal),
    };
  } catch (error) {
    console.error("Increase goal target error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Delete a reading goal.
 * Verifies the goal belongs to the user before deleting.
 */
export async function deleteReadingGoal(
  goalId: string
): Promise<{ success: true } | ReadingGoalError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Verify the goal belongs to the user
    const { data: existingGoal, error: fetchError } = await supabase
      .from("reading_goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingGoal) {
      return {
        success: false,
        error: "Goal not found or access denied",
      };
    }

    // Delete the goal
    const { error: deleteError } = await supabase
      .from("reading_goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting reading goal:", deleteError);
      return { success: false, error: "Failed to delete reading goal" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete reading goal error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
