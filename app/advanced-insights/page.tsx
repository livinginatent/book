import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Target, Activity, Flame } from "lucide-react";

import { getVelocityStats } from "@/app/actions/insights";
import {
  ActivityHeatmap,
  DailyAverageCard,
  ForecastSection,
  StreakCard,
  YtdPagesCard,
} from "@/components/insights/velocity";

function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stats grid skeleton */}
      <div>
        <div className="h-6 w-48 bg-muted rounded mb-2" />
        <div className="h-4 w-96 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
      {/* Heatmap skeleton */}
      <div>
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
      {/* Forecast skeleton */}
      <div>
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-80 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

async function VelocityInsights() {
  const result = await getVelocityStats();

  if (!result.success) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center">
        <p className="text-muted-foreground">{result.error}</p>
        <Link href="/login" className="text-primary hover:underline mt-2 inline-block">
          Sign in to view insights
        </Link>
      </div>
    );
  }

  const {
    heatmapData,
    avgPagesPerDay,
    weeklyTotal,
    currentStreak,
    bestStreak,
    ytdPages,
    booksFinishedYtd,
    forecastBooks,
  } = result;

  // Transform heatmap data for the component
  const heatmapForComponent = heatmapData.map((d) => ({
    date: d.date,
    pages: d.count,
  }));

  // Calculate max pages for heatmap color scaling
  const maxPages = Math.max(...heatmapData.map((d) => d.count), 1);

  return (
    <div className="space-y-10">
      {/* Section 1: Core Metrics */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Core Metrics</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Your reading productivity at a glance — velocity, streaks, and year-to-date progress
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DailyAverageCard
            pagesPerDay={avgPagesPerDay}
            weeklyTotal={weeklyTotal}
          />
          <StreakCard
            currentStreak={currentStreak}
            bestStreak={bestStreak}
          />
          <YtdPagesCard
            totalPages={ytdPages}
            booksFinished={booksFinishedYtd}
          />
        </div>
      </section>

      {/* Section 2: Activity Heatmap */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">Reading History</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          A visual timeline of your reading journey over the past year
        </p>
        <ActivityHeatmap
          data={heatmapForComponent}
          maxPages={Math.max(maxPages, 50)}
        />
      </section>

      {/* Section 3: Forecast */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-foreground">Book Forecasts</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Predicted completion dates based on your current reading velocity
        </p>
        <ForecastSection books={forecastBooks} />
      </section>
    </div>
  );
}

export default function AdvancedInsightsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">Reading Command Center</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Reading Velocity
              </h2>
              <p className="text-sm text-muted-foreground">
                Your productivity command center
              </p>
            </div>
          </div>

          {/* Description Card */}
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
            <p className="text-sm text-foreground leading-relaxed">
              This dashboard focuses on <strong>how</strong> you read, not just what you read.
              Track your reading pace with the <span className="text-blue-500 font-medium">Velocity Engine</span>,
              maintain momentum with the <span className="text-orange-500 font-medium">Streak Counter</span>,
              visualize your consistency with the <span className="text-emerald-500 font-medium">Activity Heatmap</span>,
              and see exactly when you'll finish your current books with the <span className="text-violet-500 font-medium">Completion Forecast</span>.
            </p>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">30-Day Rolling Average</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-medium">Don't Break the Chain</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">12-Month History</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Smart Predictions</span>
            </div>
          </div>
        </div>

        {/* Velocity Content */}
        <Suspense fallback={<LoadingSkeleton />}>
          <VelocityInsights />
        </Suspense>
      </main>
    </div>
  );
}
