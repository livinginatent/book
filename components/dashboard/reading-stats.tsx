"use client";

import { Clock, Calendar, Loader2, Hash } from "lucide-react";
import { useState, useEffect } from "react";
import { IoStatsChart } from "react-icons/io5";

import {
  getReadingStats,
  type ReadingStatsPeriod,
} from "@/app/actions/reading-stats";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";

interface ReadingStatsData {
  booksRead: number;
  pagesRead: number;
  readingStreak: number;
  avgPagesPerDay: number;
}

const periods: Array<{ value: ReadingStatsPeriod; label: string }> = [
  { value: "1month", label: "1 Month" },
  { value: "3months", label: "3 Months" },
  { value: "6months", label: "6 Months" },
  { value: "year", label: "Year" },
  { value: "ytd", label: "YTD" },
];

export function ReadingStats() {
  const [period, setPeriod] = useState<ReadingStatsPeriod>("1month");
  const [stats, setStats] = useState<ReadingStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);

      const result = await getReadingStats(period);

      if (result.success) {
        setStats({
          booksRead: result.booksRead,
          pagesRead: result.pagesRead,
          readingStreak: result.readingStreak,
          avgPagesPerDay: result.avgPagesPerDay,
        });
      } else {
        setError(result.error);
      }

      setLoading(false);
    }

    fetchStats();

    // Listen for refresh events
    const handleRefresh = () => {
      fetchStats();
    };

    window.addEventListener("refresh-reading-stats", handleRefresh);
    window.addEventListener("book-added", handleRefresh);
    window.addEventListener("book-status-changed", handleRefresh);

    return () => {
      window.removeEventListener("refresh-reading-stats", handleRefresh);
      window.removeEventListener("book-added", handleRefresh);
      window.removeEventListener("book-status-changed", handleRefresh);
    };
  }, [period]);

  return (
    <DashboardCard
      title="Reading Stats"
      description="Your reading journey"
      icon={IoStatsChart}
    >
      <div className="space-y-4">
        {/* Period Toggles */}
        <div className="flex flex-wrap gap-2">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={cn(
                "text-xs",
                period === p.value && "bg-primary text-primary-foreground"
              )}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive py-4">{error}</div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Hash}
              value={String(stats.booksRead)}
              label="Books Read"
            />
            <StatCard
              icon={Calendar}
              value={String(stats.pagesRead)}
              label="Pages Read"
            />
            <StatCard
              icon={Clock}
              value={`${stats.readingStreak} days`}
              label="Reading Streak"
            />
            <StatCard
              icon={IoStatsChart}
              value={String(stats.avgPagesPerDay)}
              label="Avg Pages/Day"
            />
          </div>
        ) : null}
      </div>
    </DashboardCard>
  );
}
