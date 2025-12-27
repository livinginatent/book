"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Singleton supabase client for the browser
let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

// Serializable user data from server
export interface InitialAuthData {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: Profile | null;
}

interface AuthProviderProps {
  children: ReactNode;
  initialAuth?: InitialAuthData;
}

export function AuthProvider({ children, initialAuth }: AuthProviderProps) {
  // Initialize with server data if available
  const [user, setUser] = useState<User | null>(
    initialAuth?.user ? (initialAuth.user as User) : null
  );
  const [profile, setProfile] = useState<Profile | null>(
    initialAuth?.profile ?? null
  );
  // If we have initial auth data, we're not loading
  const [loading, setLoading] = useState(!initialAuth);

  // Refs to track current values inside callbacks
  const userRef = useRef<User | null>(user);

  const supabase = useMemo(() => getSupabase(), []);

  // Fetch profile for a user
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return null;
        }
        return data;
      } catch (err) {
        console.error("Profile fetch error:", err);
        return null;
      }
    },
    [supabase]
  );

  // Initialize auth state on mount
  useEffect(() => {
    const mounted = { current: true };

    // If we have initial auth, just set up listeners (no need to fetch)
    // If we don't have initial auth, fetch the current user
    const initializeAuth = async () => {
      if (!initialAuth) {
        try {
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();

          if (!mounted.current) return;

          userRef.current = currentUser;
          setUser(currentUser);

          if (currentUser) {
            const userProfile = await fetchProfile(currentUser.id);
            if (mounted.current) {
              setProfile(userProfile);
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
        } finally {
          if (mounted.current) {
            setLoading(false);
          }
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes (sign in, sign out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted.current) return;

      // Skip token refresh - no UI change needed
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      // Skip INITIAL_SESSION if we already have initial auth data
      if (event === "INITIAL_SESSION" && initialAuth) {
        return;
      }

      const newUser = session?.user ?? null;

      // Handle sign out
      if (event === "SIGNED_OUT") {
        userRef.current = null;
        setUser(null);
        setProfile(null);
        return;
      }

      // Handle sign in or user change
      if (
        event === "SIGNED_IN" ||
        (event === "INITIAL_SESSION" && !initialAuth)
      ) {
        if (newUser && newUser.id !== userRef.current?.id) {
          userRef.current = newUser;
          setUser(newUser);
          const userProfile = await fetchProfile(newUser.id);
          if (mounted.current) {
            setProfile(userProfile);
          }
        }
        setLoading(false);
      }
    });

    // Listen for manual profile refresh requests
    const handleProfileRefresh = async () => {
      if (!mounted.current) return;
      const currentUser = userRef.current;
      if (currentUser) {
        const userProfile = await fetchProfile(currentUser.id);
        if (mounted.current) {
          setProfile(userProfile);
        }
      }
    };
    window.addEventListener("profile-refresh", handleProfileRefresh);

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-refresh", handleProfileRefresh);
    };
  }, [supabase, fetchProfile, initialAuth]);

  // Sign out - clears state immediately, waits for async cleanup
  const signOut = useCallback(async () => {
    // Clear state immediately for instant UI update
    userRef.current = null;
    setUser(null);
    setProfile(null);

    // Wait for actual signout to complete
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }, [supabase]);

  // Manual profile refresh
  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    const userProfile = await fetchProfile(currentUser.id);
    setProfile(userProfile);
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Convenience hooks for specific data
export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}

export function useProfile() {
  const { profile, loading, refreshProfile } = useAuth();

  const isPremium = profile?.subscription_tier === "bibliophile";
  const isFree =
    profile?.subscription_tier === "free" || !profile?.subscription_tier;

  return {
    profile,
    loading,
    isPremium,
    isFree,
    subscriptionTier: profile?.subscription_tier ?? null,
    refreshProfile,
  };
}

export { AuthContext };
