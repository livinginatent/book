import { createClient } from "@/lib/supabase/client";
import type { Profile, SubscriptionTier } from "@/types/database.types";

/**
 * Get the current user's profile (client-side)
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

/**
 * Check if the current user has a specific subscription tier
 */
export async function hasSubscription(tier: SubscriptionTier): Promise<boolean> {
  const profile = await getProfile();
  return profile?.subscription_tier === tier;
}

/**
 * Check if the current user is a paying subscriber (Bibliophile)
 */
export async function isPremiumUser(): Promise<boolean> {
  return hasSubscription("bibliophile");
}

/**
 * Update the current user's profile (client-side)
 */
export async function updateProfile(
  updates: Partial<Pick<Profile, "full_name" | "avatar_url">>
): Promise<Profile | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }

  return data;
}

