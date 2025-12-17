"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    
    // Use getUser() instead of getSession() - it's more reliable
    // as it validates the session with the server
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    refreshUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Update user state on any auth event
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Force refresh on sign in/out events
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        refreshUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  // Re-check auth state on route changes (handles server-side redirects)
  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

  return { user, loading, refreshUser };
}
