"use client";

import { useEffect, useState, useCallback } from "react";

import {
  getSmartRecommendations,
  clearRecommendationCache,
  type BookRecommendation,
} from "@/app/actions/recommendations";

interface UseRecommendationsReturn {
  recommendations: BookRecommendation[];
  loading: boolean;
  error: string | null;
  tier: "free" | "bibliophile" | null;
  cachedAt: string | null;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Custom hook for managing smart book recommendations
 * 
 * Features:
 * - Automatic loading on mount
 * - Cache management
 * - Refresh functionality
 * - Loading and error states
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { recommendations, loading, refresh } = useRecommendations();
 *   
 *   if (loading) return <Spinner />;
 *   
 *   return (
 *     <div>
 *       {recommendations.map(rec => (
 *         <div key={rec.title}>{rec.title}</div>
 *       ))}
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRecommendations(
  autoLoad = true
): UseRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "bibliophile" | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecommendations = useCallback(
    async (force = false) => {
      try {
        if (force) {
          setIsRefreshing(true);
          // Clear cache first
          await clearRecommendationCache();
        } else {
          setLoading(true);
        }

        const result = await getSmartRecommendations();

        if (result.success) {
          setRecommendations(result.recommendations);
          setTier(result.tier);
          setCachedAt(result.cachedAt || null);
          setError(null);
        } else {
          setError(result.error);
          setRecommendations([]);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load recommendations";
        setError(errorMessage);
        console.error("Recommendations error:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    await fetchRecommendations(true);
  }, [fetchRecommendations]);

  useEffect(() => {
    if (autoLoad) {
      fetchRecommendations(false);
    }
  }, [autoLoad, fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    tier,
    cachedAt,
    refresh,
    isRefreshing,
  };
}

/**
 * Get cache age in days
 */
export function getCacheAge(cachedAt: string | null): number | null {
  if (!cachedAt) return null;
  
  const cacheDate = new Date(cachedAt);
  const now = new Date();
  const diffMs = now.getTime() - cacheDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Check if recommendations should be refreshed
 * Returns true if cache is older than threshold (default 3 days)
 */
export function shouldRefresh(
  cachedAt: string | null,
  thresholdDays = 3
): boolean {
  const age = getCacheAge(cachedAt);
  return age !== null && age >= thresholdDays;
}

/**
 * Format cache age for display
 */
export function formatCacheAge(cachedAt: string | null): string {
  const age = getCacheAge(cachedAt);
  
  if (age === null) return "Just now";
  if (age === 0) return "Today";
  if (age === 1) return "Yesterday";
  return `${age} days ago`;
}
