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
 * Resolve the current user's subscription tier.
 */
async function getUserSubscriptionTier(
  supabase: ReturnType<typeof createClient>
): Promise<SubscriptionTier | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching subscription tier:", error);
    return null;
  }

  return (profile?.subscription_tier as SubscriptionTier | null) ?? "free";
}

/**
 * Check if a user can create a new active goal based on their subscription tier limit.
 *
 * @param userId - The user's ID
 * @returns Object with canCreate boolean and current count, or error
 */
export async function canCreateGoal(
  userId: string
): Promise<
  | { success: true; canCreate: boolean; currentCount: number; limit: number }
  | ReadingGoalError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get user's subscription tier from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return {
        success: false,
        error: "Failed to fetch user profile",
      };
    }

    const tier =
      (profile?.subscription_tier as SubscriptionTier | null) ?? "free";
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

    const tier = (await getUserSubscriptionTier(supabase)) ?? "free";

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

    const tier = (await getUserSubscriptionTier(supabase)) ?? "free";

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
    const { error: deactivateError } = await supabase
      .from("reading_goals")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating existing goals:", deactivateError);
    }

    // Create a new active goal
    const { data: goal, error: insertError } = await supabase
      .from("reading_goals")
      .insert({
        user_id: user.id,
        type,
        is_active: true,
        config,
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
 * Calculate goal progress from user_books table based on goal type
 */
async function calculateGoalProgress(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  goalType: GoalType,
  goalYear: number,
  goalConfig: Record<string, unknown>
): Promise<number> {
  // Determine date range based on goal type and config
  let dateStart: string;
  let dateEnd: string;

  if (goalType === "books") {
    // For books goals, use custom period if available
    const periodMonths = goalConfig.period_months as number | undefined;
    const startDateStr = goalConfig.start_date as string | undefined;
    const endDateStr = goalConfig.end_date as string | undefined;

    if (startDateStr && endDateStr) {
      // Custom date range
      dateStart = new Date(startDateStr).toISOString().split("T")[0];
      dateEnd = new Date(endDateStr).toISOString().split("T")[0];
    } else if (periodMonths && startDateStr) {
      // Preset period with stored start date
      dateStart = new Date(startDateStr).toISOString().split("T")[0];
      const startDate = new Date(startDateStr);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + periodMonths);
      dateEnd = endDate.toISOString().split("T")[0];
    } else if (periodMonths) {
      // Preset period without stored start (fallback - use current date)
      const now = new Date();
      dateStart = now.toISOString().split("T")[0];
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + periodMonths);
      dateEnd = endDate.toISOString().split("T")[0];
    } else {
      // Fallback to year
      dateStart = new Date(goalYear, 0, 1).toISOString().split("T")[0];
      dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999)
        .toISOString()
        .split("T")[0];
    }
  } else {
    // For other goal types, use year
    dateStart = new Date(goalYear, 0, 1).toISOString().split("T")[0];
    dateEnd = new Date(goalYear, 11, 31, 23, 59, 59, 999)
      .toISOString()
      .split("T")[0];
  }

  switch (goalType) {
    case "books": {
      // Count finished books in the period
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
      // Sum page_count from finished books in the period
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
      // Count distinct genres from finished books in the period
      // Filter by selected genres if specified
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

      // Collect all unique genres
      const allGenres = new Set<string>();
      (books || []).forEach((book) => {
        (book.subjects || []).forEach((genre: string) => {
          // If specific genres are selected, only count those
          if (selectedGenres.length === 0 || selectedGenres.includes(genre)) {
            allGenres.add(genre);
          }
        });
      });

      return allGenres.size;
    }

    case "consistency": {
      // Count consecutive days with finished books
      // For simplicity, we'll count unique days with finished books
      // A more sophisticated approach would track actual consecutive days
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

      // Count unique days
      const uniqueDays = new Set<string>();
      finishedBooks.forEach((ub) => {
        if (ub.date_finished) {
          // Extract just the date part (YYYY-MM-DD)
          const dateOnly = ub.date_finished.split("T")[0];
          uniqueDays.add(dateOnly);
        }
      });

      // For consistency goals, we want consecutive days
      // For now, return unique days count - can be enhanced later
      return uniqueDays.size;
    }

    default:
      return 0;
  }
}

/**
 * Get all active goals for the current user.
 * Automatically calculates progress from user_books table for each goal.
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

    // Calculate progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        const config = (goal.config as Record<string, unknown>) || {};
        const goalYear = (config.year as number) || new Date().getFullYear();
        const currentProgress = await calculateGoalProgress(
          supabase,
          user.id,
          goal.type,
          goalYear,
          config
        );

        const componentGoal = dbGoalToComponentGoal(goal);
        componentGoal.current = currentProgress;
        return componentGoal;
      })
    );

    return {
      success: true,
      goals: goalsWithProgress,
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

    const tier = (await getUserSubscriptionTier(supabase)) ?? "free";

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
    const { error: deactivateError } = await supabase
      .from("reading_goals")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      console.error("Error deactivating existing goals:", deactivateError);
    }

    // Create a new active goal
    const { data: dbGoal, error: insertError } = await supabase
      .from("reading_goals")
      .insert({
        user_id: user.id,
        type: type as GoalType,
        is_active: true,
        config,
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
    const tier = (await getUserSubscriptionTier(supabase)) ?? "free";
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
