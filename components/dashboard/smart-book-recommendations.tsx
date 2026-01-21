"use client";

import { Aperture, Loader2, Sparkles, Star, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getSmartRecommendations,
  clearRecommendationCache,
  type BookRecommendation,
} from "@/app/actions/recommendations";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SmartBookRecommendationsProps {
  isPriority?: boolean;
  locked?: boolean;
}

export function SmartBookRecommendations({
  isPriority = false,
  locked = false,
}: SmartBookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "bibliophile">("free");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const fetchRecommendations = async (force = false) => {
    try {
      if (force) {
        setIsRefreshing(true);
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
      }
    } catch (err) {
      setError("Failed to load recommendations");
      console.error("Recommendations error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRefresh = async () => {
    await fetchRecommendations(true);
  };

  if (loading) {
    return (
      <DashboardCard
        title="Smart Recommendations"
        description="AI-powered book suggestions"
        icon={Sparkles}
        locked={locked}
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating recommendations...
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  if (error) {
    return (
      <DashboardCard
        title="Smart Recommendations"
        description="AI-powered book suggestions"
        icon={Sparkles}
        locked={locked}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchRecommendations()}>
            Try Again
          </Button>
        </div>
      </DashboardCard>
    );
  }

  const displayCount = tier === "free" ? 3 : 5; // Show 5 of 10 for premium
  const displayedRecommendations = recommendations.slice(0, displayCount);

  return (
    <DashboardCard
      title={
        <div className="flex items-center gap-2">
          <span>Smart Recommendations</span>
          <Badge variant={tier === "bibliophile" ? "default" : "secondary"} className="text-xs">
            {tier === "bibliophile" ? "Premium" : "Free"}
          </Badge>
        </div>
      }
      description="AI-powered suggestions based on your reading DNA"
      icon={Sparkles}
      locked={locked}
      action={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
        </Button>
      }
    >
      <div className="space-y-3">
        {displayedRecommendations.map((book, index) => (
          <div
            key={`${book.title}-${index}`}
            className="group relative flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-medium text-sm line-clamp-1">{book.title}</p>
                <div className="flex items-center gap-1 text-primary shrink-0">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-medium">
                    {book.matchPercentage}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                {book.author}
              </p>
              <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {book.reason}
              </p>
              {book.genres && book.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {book.genres.slice(0, 2).map((genre, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-5"
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {recommendations.length > displayCount && (
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              {tier === "bibliophile"
                ? `+${recommendations.length - displayCount} more recommendations`
                : "Upgrade to Premium for more recommendations"}
            </p>
          </div>
        )}

        {cachedAt && (
          <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
            Generated {new Date(cachedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
