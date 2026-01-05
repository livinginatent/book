"use client";

import { Clock, Calendar, Loader2, Hash, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        periodDropdownRef.current &&
        !periodDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPeriodDropdown(false);
      }
    }

    if (showPeriodDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPeriodDropdown]);

  const selectedPeriodLabel =
    periods.find((p) => p.value === period)?.label || "1 Month";

  return (
    <DashboardCard
      title="Reading Stats"
      description="Your reading journey"
      icon={IoStatsChart}
    >
      <div className="space-y-4">
        {/* Period Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Period:
          </span>
          <div className="relative" ref={periodDropdownRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="gap-2 min-w-[140px] justify-between"
            >
              {selectedPeriodLabel}
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  showPeriodDropdown && "rotate-180"
                )}
              />
            </Button>
            {showPeriodDropdown && (
              <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {periods.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPeriod(option.value);
                      setShowPeriodDropdown(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                      period === option.value && "bg-accent font-medium"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
