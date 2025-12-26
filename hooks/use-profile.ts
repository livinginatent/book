"use client";

import { useOptionalAuthContext } from "@/components/providers/auth-provider";

/**
 * Hook to access profile state.
 * Uses AuthContext when available, providing centralized profile state.
 */
export function useProfile() {
  const context = useOptionalAuthContext();
  
  if (!context) {
    throw new Error("useProfile must be used within an AuthProvider");
  }
  
  return {
    profile: context.profile,
    loading: context.profileLoading,
    isPremium: context.isPremium,
    isFree: context.isFree,
    subscriptionTier: context.subscriptionTier,
    refreshProfile: context.refreshProfile,
  };
}
