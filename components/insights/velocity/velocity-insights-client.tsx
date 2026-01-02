"use client";

import {  Flame, History, ChartLine } from "lucide-react";
import { useState, useEffect, useTransition } from "react";

import { getVelocityStats, type VelocityRange } from "@/app/actions/insights";
import {
  ActivityHeatmap,
  DailyAverageCard,
  ForecastSection,
  StreakCard,
  YtdPagesCard,
  RangeSelector,
} from "@/components/insights/velocity";

interface VelocityInsightsClientProps {
  onLoadingChange?: (loading: boolean) => void;
}

export function VelocityInsightsClient({
  onLoadingChange,
}: VelocityInsightsClientProps) {
  const [range, setRange] = useState<VelocityRange>("ytd");
  const [data, setData] = useState<Awaited<ReturnType<typeof getVelocityStats>> | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onLoadingChange?.(isPending);
  }, [isPending, onLoadingChange]);

  useEffect(() => {
    startTransition(async () => {
      setError(null);
      const result = await getVelocityStats(range);
      if (result.success) {
        setData(result);
      } else {
        setError(result.error);
      }
    });
  }, [range]);

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-64 rounded-2xl bg-muted" />
        </div>
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-4" />
          <div className="h-80 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const {
    heatmapData,
    avgPagesPerDay,
    weeklyTotal,
    currentStreak,
    bestStreak,
    totalPages,
    booksFinished,
    rangeLabel,
    forecastBooks,
  } = data;

  // Transform heatmap data for the component
  const heatmapForComponent = heatmapData.map((d) => ({
    date: d.date,
    pages: d.count,
  }));

  // Calculate max pages for heatmap color scaling
  const maxPages = Math.max(...heatmapData.map((d) => d.count), 1);

  return (
    <div className="space-y-10">
      {/* Range Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            View Progress Through
          </h3>
          <p className="text-xs text-muted-foreground">
            Switch between different time periods to analyze your reading
            patterns
          </p>
        </div>
        <div className="flex-1 max-w-2xl">
          <RangeSelector
            value={range}
            onChange={(newRange) => setRange(newRange)}
          />
        </div>
      </div>

      {/* Section 1: Core Metrics */}
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <ChartLine className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Core Metrics
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Your reading productivity at a glance — velocity, streaks, and{" "}
          {rangeLabel.toLowerCase()} progress
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DailyAverageCard
            pagesPerDay={avgPagesPerDay}
            weeklyTotal={weeklyTotal}
            rangeLabel={rangeLabel}
          />
          <StreakCard currentStreak={currentStreak} bestStreak={bestStreak} />
          <YtdPagesCard
            totalPages={totalPages}
            booksFinished={booksFinished}
            rangeLabel={rangeLabel}
          />
        </div>
      </section>

      {/* Section 2: Activity Heatmap */}
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Reading History
          </h2>
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
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Book Forecasts
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Predicted completion dates based on your current reading velocity
        </p>
        <ForecastSection books={forecastBooks} />
      </section>
    </div>
  );
}


