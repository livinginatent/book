"use client";

import { useOptionalAuthContext } from "@/components/providers/auth-provider";

/**
 * Hook to access auth state.
 * Uses AuthContext when available, providing centralized auth state.
 */
export function useAuth() {
  const context = useOptionalAuthContext();
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return {
    user: context.user,
    loading: context.loading,
    refreshUser: context.refreshUser,
  };
}
