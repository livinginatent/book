"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { componentGoalToDbGoal, dbGoalToComponentGoal } from "@/lib/goal-wizard/goal-converters";
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

    const types =
      tier === "bibliophile" ? PREMIUM_TIER_TYPES : FREE_TIER_TYPES;

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
 * Get the user's current active goal, if any.
 * Useful for rehydrating the wizard with the previously selected type.
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

    return {
      success: true,
      goal: dbGoalToComponentGoal(goal),
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
 */
export async function updateGoalProgress(
  newCurrent: number
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

    // Update the config with new current value
    const config = (dbGoal.config as Record<string, unknown>) || {};
    const updatedConfig = {
      ...config,
      current: Math.max(0, newCurrent), // Ensure non-negative
    };

    const { data: updatedGoal, error: updateError } = await supabase
      .from("reading_goals")
      .update({ config: updatedConfig })
      .eq("id", dbGoal.id)
      .select("*")
      .single();

    if (updateError || !updatedGoal) {
      console.error("Error updating goal progress:", updateError);
      return { success: false, error: "Failed to update goal progress" };
    }

    return {
      success: true,
      goal: dbGoalToComponentGoal(updatedGoal),
    };
  } catch (error) {
    console.error("Update goal progress error:", error);
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


