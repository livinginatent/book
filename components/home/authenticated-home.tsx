"use client";

import { Sparkles, Crown } from "lucide-react";
import Link from "next/link";

import { AdvancedInsights } from "@/components/dashboard/advanced-insights";
import { BookRecommendations } from "@/components/dashboard/book-recommendations";
import { CurrentlyReading } from "@/components/dashboard/currently-reading";
import { MoodTracker } from "@/components/dashboard/mood-tracker";
import { PrivateShelves } from "@/components/dashboard/private-shelves";
import { ReadingStats } from "@/components/dashboard/reading-stats";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export function AuthenticatedHome() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, isPremium, isFree } = useProfile();

  const displayName =
    profile?.username || user?.email?.split("@")[0] || "there";

  // Mock data - replace with real data from your backend
  const mockBooks = [
    {
      id: "1",
      title: "The Name of the Wind",
      author: "Patrick Rothfuss",
      cover: "/covers/notw.jpg",
      progress: 65,
    },
    {
      id: "2",
      title: "Dune",
      author: "Frank Herbert",
      cover: "/covers/dune.jpg",
      progress: 30,
    },
  ];

  const mockStats = {
    booksRead: 12,
    pagesRead: 3420,
    readingStreak: 7,
    avgPagesPerDay: 45,
  };

  // Show loading skeleton while profile is loading
  if (profileLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded-lg w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">
                Welcome back, {displayName}!
              </h1>
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full  border border-primary/30">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Bibliophile
                  </span>
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-lg">
              {isPremium
                ? "Enjoy your premium reading experience"
                : "Continue your reading journey"}
            </p>
          </div>

          {/* Upgrade CTA for free users */}
          {isFree && (
            <Link href="/checkout">
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Sparkles className="w-4 h-4" />
                Upgrade to Bibliophile
              </Button>
            </Link>
          )}
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Currently Reading - Available to all */}
            <CurrentlyReading books={mockBooks} />

            {/* Reading Stats - Available to all */}
            <ReadingStats {...mockStats} />

            {/* Advanced Insights - Premium only */}
            <AdvancedInsights locked={isFree} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Book Recommendations */}
            {isPremium ? (
              // Premium users get priority recommendations
              <BookRecommendations isPriority />
            ) : (
              // Free users get basic recommendations
              <BookRecommendations />
            )}

            {/* Private Shelves - Premium only */}
            <PrivateShelves locked={isFree} />

            {/* Mood Tracker - Premium only */}
            <MoodTracker locked={isFree} />
          </div>
        </div>

        {/* Upgrade Banner for Free Users */}
        {isFree && (
          <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Unlock Your Full Reading Potential
                  </h3>
                  <p className="text-muted-foreground">
                    Get private shelves, mood tracking, advanced insights, and
                    priority recommendations.
                  </p>
                </div>
              </div>
              <Link href="/checkout">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 whitespace-nowrap"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
