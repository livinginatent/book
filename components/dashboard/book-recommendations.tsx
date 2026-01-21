"use client";

import { Sparkles, Star, Lock, Loader2, BookOpen, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaHatWizard } from "react-icons/fa";

import {
  getSmartRecommendations,
  type BookRecommendation,
} from "@/app/actions/recommendations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
interface BookRecommendationsProps {
  locked?: boolean;
  isPriority?: boolean;
}

export function BookRecommendations({
  locked = false,
  isPriority: _isPriority = false,
}: BookRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<BookRecommendation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<"free" | "bibliophile">("free");

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        const result = await getSmartRecommendations();

        if (result.success) {
          setRecommendations(result.recommendations);
          setTier(result.tier);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load recommendations");
        console.error("Recommendations error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  const handleRecommendationClick = (bookTitle: string) => {
    // Dispatch custom event to populate search field
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("populate-book-search", {
          detail: { query: bookTitle },
        })
      );
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardCard
        title="Book Recommendations"
        description="Personalized suggestions based on your reading DNA"
        icon={Sparkles}
        locked={locked}
      >
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analyzing your reading profile...
            </p>
          </div>
        </div>
      </DashboardCard>
    );
  }

  // Empty state - not enough books
  if (error && error.includes("finish more books")) {
    return (
      <DashboardCard
        title="Book Recommendations"
        description="Personalized suggestions based on your reading DNA"
        icon={Sparkles}
        locked={locked}
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Almost There!</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Finish 3 books to generate your first personalized recommendations.
          </p>
        </div>
      </DashboardCard>
    );
  }

  // Error state (other errors)
  if (error) {
    return (
      <DashboardCard
        title="Book Recommendations"
        description="Personalized suggestions based on your reading DNA"
        icon={Sparkles}
        locked={locked}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </DashboardCard>
    );
  }

  const isPremium = tier === "bibliophile";
  const displayCount = isPremium ? 5 : 3;
  const displayedRecommendations = recommendations.slice(0, displayCount);

  return (
    <DashboardCard
      title="Book Recommendations"
      description={
        isPremium
          ? "Curated picks matching your reading DNA"
          : "Personalized suggestions based on your reading history"
      }
      icon={FaHatWizard}
      locked={locked}
      action={
        isPremium ? (
          <Badge variant="default" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            DNA Match
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {displayedRecommendations.map((book, index) => (
          <div
            key={`${book.title}-${index}`}
            onClick={() => handleRecommendationClick(book.title)}
            className="group flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
          >
            <div className="w-10 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{book.title}</p>
              <p className="text-xs text-muted-foreground mb-1">
                {book.author}
              </p>
              {isPremium && book.reason && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-5"
                  >
                    <Sparkles className="w-2.5 h-2.5 mr-1" />
                    Algorithm Match
                  </Badge>
                  <p className="text-[10px] text-muted-foreground/80 line-clamp-1">
                    {book.reason}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 text-primary shrink-0">
             
              <span className="text-xs font-medium">
                {book.matchPercentage}% match
              </span>
            </div>
          </div>
        ))}

        {/* Free tier: Unlock DNA Matching card */}
        {!isPremium && (
          <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4">
            {/* Blurred recommendation preview */}
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm z-10" />

            {/* Content */}
            <div className="relative z-20 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">
                  Unlock DNA Matching
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Get 10 deeply personalized recommendations based on your
                  Reading DNA profile
                </p>
                <Button asChild size="sm" className="h-8 text-xs">
                  <Link href="/pricing">
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Upgrade for Deep Insights
                  </Link>
                </Button>
              </div>
            </div>

            {/* Ghost recommendation (blurred) */}
            <div className="absolute top-4 left-4 right-4 flex items-center gap-3 opacity-50 blur-[2px]">
              <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">The Hidden Mystery</p>
                <p className="text-xs text-muted-foreground">Jane Author</p>
              </div>
              <div className="flex items-center gap-1 text-primary">
                <Star className="w-3 h-3 fill-current" />
                <span className="text-xs font-medium">96%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
