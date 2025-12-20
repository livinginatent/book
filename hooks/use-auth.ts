/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import type { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

import { createClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const lastUserIdRef = useRef<string | null>(null);

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    
    // Use getUser() instead of getSession() - it's more reliable
    // as it validates the session with the server
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Only update state if user ID actually changed (prevents unnecessary re-renders)
    const newUserId = currentUser?.id ?? null;
    if (newUserId !== lastUserIdRef.current) {
      lastUserIdRef.current = newUserId;
      setUser(currentUser);
    }
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
      const newUserId = session?.user?.id ?? null;
      
      // Only update if user ID changed (prevents re-renders on TOKEN_REFRESHED)
      if (newUserId !== lastUserIdRef.current) {
        lastUserIdRef.current = newUserId;
        setUser(session?.user ?? null);
      }
      setLoading(false);
      
      // Force refresh on sign in/out events (not token refresh)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
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
