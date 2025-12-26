"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  isPremium: boolean;
  isFree: boolean;
  subscriptionTier: string | null;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  
  const userRef = useRef<User | null>(null);

  // Memoize supabase client
  const supabase = useMemo(() => createClient(), []);

  // Fetch profile for a user
  const fetchProfileForUser = useCallback(async (userId: string): Promise<Profile | null> => {
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
  }, [supabase]);

  // Initialize on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!isMounted) return;

        userRef.current = currentUser;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await fetchProfileForUser(currentUser.id);
          if (isMounted) {
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setProfileLoading(false);
        }
      }
    };

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        const newUser = session?.user ?? null;
        const newUserId = newUser?.id ?? null;
        const currentUserId = userRef.current?.id ?? null;

        // Only update if user actually changed
        if (newUserId !== currentUserId) {
          userRef.current = newUser;
          setUser(newUser);

          if (newUser) {
            setProfileLoading(true);
            const userProfile = await fetchProfileForUser(newUser.id);
            if (isMounted) {
              setProfile(userProfile);
              setProfileLoading(false);
            }
          } else {
            setProfile(null);
            setProfileLoading(false);
          }
        }

        setLoading(false);
      }
    );

    // Listen for profile refresh events
    const handleProfileRefresh = async () => {
      const currentUser = userRef.current;
      if (!isMounted || !currentUser) return;
      
      setProfileLoading(true);
      const userProfile = await fetchProfileForUser(currentUser.id);
      if (isMounted) {
        setProfile(userProfile);
        setProfileLoading(false);
      }
    };
    window.addEventListener("profile-refresh", handleProfileRefresh);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("profile-refresh", handleProfileRefresh);
    };
  }, [supabase, fetchProfileForUser]);

  // Manual refresh functions
  const refreshUser = useCallback(async () => {
    setLoading(true);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    userRef.current = currentUser;
    setUser(currentUser);
    
    if (currentUser) {
      setProfileLoading(true);
      const userProfile = await fetchProfileForUser(currentUser.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
    
    setLoading(false);
    setProfileLoading(false);
  }, [supabase, fetchProfileForUser]);

  const refreshProfile = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    
    setProfileLoading(true);
    const userProfile = await fetchProfileForUser(currentUser.id);
    setProfile(userProfile);
    setProfileLoading(false);
  }, [fetchProfileForUser]);

  // Memoize derived values
  const isPremium = profile?.subscription_tier === "bibliophile";
  const isFree = profile?.subscription_tier === "free" || !profile?.subscription_tier;
  const subscriptionTier = profile?.subscription_tier ?? null;

  // Memoize context value
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      isPremium,
      isFree,
      subscriptionTier,
      refreshUser,
      refreshProfile,
    }),
    [user, profile, loading, profileLoading, isPremium, isFree, subscriptionTier, refreshUser, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}

// Check if we're inside the provider (for hooks that need to work both with and without context)
export function useOptionalAuthContext() {
  return useContext(AuthContext);
}

export { AuthContext };
