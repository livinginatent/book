"use client";

import {
  LineChart,
  TrendingUp,
  Zap,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

import type { QuickInsightsData } from "@/app/actions/dashboard-data";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface AdvancedInsightsProps {
  locked?: boolean;
  initialData?: QuickInsightsData;
}

export function AdvancedInsights({
  locked = false,
  initialData,
}: AdvancedInsightsProps) {
  // Use pre-fetched data directly - no client-side loading needed!
  const insights = initialData;

  return (
    <DashboardCard
      title="Advanced Insights"
      description="Deep dive into your reading patterns"
      icon={LineChart}
      locked={locked}
    >
      <div className="space-y-4">
        {insights ? (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <TrendingUp className="w-5 h-5 text-accent" />
              <div className="flex-1">
                <p className="font-medium text-sm">30-Day Rolling Average</p>
                <p className="text-xs text-muted-foreground">
                  {insights.avgPagesPerDay > 0
                    ? `You read ${insights.avgPagesPerDay} pages per day on average`
                    : "Start reading to see your pace"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Zap className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Current Streak</p>
                <p className="text-xs text-muted-foreground">
                  {insights.currentStreak > 0
                    ? `${insights.currentStreak} day${
                        insights.currentStreak !== 1 ? "s" : ""
                      } - Don't break the chain!`
                    : "Start your reading streak today"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <BookMarked className="w-5 h-5 text-chart-3" />
              <div className="flex-1">
                <p className="font-medium text-sm">Top Genre</p>
                <p className="text-xs text-muted-foreground">
                  {insights.topGenre
                    ? `Your most read genre is ${insights.topGenre}`
                    : "Read more books to discover your preferences"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <TrendingUp className="w-5 h-5 text-accent" />
              <div className="flex-1">
                <p className="font-medium text-sm">30-Day Rolling Average</p>
                <p className="text-xs text-muted-foreground">
                  Start reading to see your pace
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <Zap className="w-5 h-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm">Current Streak</p>
                <p className="text-xs text-muted-foreground">
                  Start your reading streak today
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <BookMarked className="w-5 h-5 text-chart-3" />
              <div className="flex-1">
                <p className="font-medium text-sm">Top Genre</p>
                <p className="text-xs text-muted-foreground">
                  Read more books to discover your preferences
                </p>
              </div>
            </div>
          </div>
        )}

        {!locked && (
          <Link href="/advanced-insights">
            <Button variant="outline" className="w-full gap-2" size="sm">
              View Full Insights
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </DashboardCard>
  );
}
