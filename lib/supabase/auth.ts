"use server";

import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { createTimer } from "@/lib/utils/perf";
import type { Profile } from "@/types/database.types";

import { createClient } from "./server";

/**
 * Memoized auth check - cached per request using React's cache()
 * This prevents multiple getUser() calls within the same request
 */
export const getAuthenticatedUser = cache(
  async (): Promise<{
    user: User | null;
    profile: Profile | null;
    error: string | null;
  }> => {
    const timer = createTimer("getAuthenticatedUser");

    try {
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);

      const authTimer = createTimer("supabase.auth.getUser");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      authTimer.end();

      if (authError || !user) {
        timer.end();
        return { user: null, profile: null, error: authError?.message || null };
      }

      // Fetch profile in the same request
      const profileTimer = createTimer("fetch profile");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      profileTimer.end();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      timer.end();
      return { user, profile: profile || null, error: null };
    } catch (error) {
      timer.end();
      console.error("Auth error:", error);
      return {
        user: null,
        profile: null,
        error: error instanceof Error ? error.message : "Auth failed",
      };
    }
  }
);

/**
 * Quick auth check - just returns user, no profile
 * Uses the same memoization as getAuthenticatedUser
 */
export const requireAuth = cache(
  async (): Promise<{
    userId: string;
    supabase: Awaited<ReturnType<typeof createClient>>;
  } | null> => {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { userId: user.id, supabase };
  }
);
