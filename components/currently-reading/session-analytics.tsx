"use client";

import { cn } from "@/lib/utils";
import { TrendingUp,  BookOpen} from "lucide-react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { GiTargetArrows } from "react-icons/gi";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface SessionAnalyticsProps {
  pagesReadToday: number;
  dailyGoal: number;
  averagePagesPerDay: number;
  totalReadingTime: string;
  weeklyData: { day: string; pages: number }[];
  className?: string;
}

export function SessionAnalytics({
  pagesReadToday,
  dailyGoal,
  averagePagesPerDay,
  totalReadingTime,
  weeklyData,
  className,
}: SessionAnalyticsProps) {
  const goalProgress = Math.min(
    100,
    Math.round((pagesReadToday / dailyGoal) * 100)
  );

  const chartConfig = {
    pages: {
      label: "Pages",
      color: "oklch(0.65 0.18 25)",
    },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Today's Progress */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GiTargetArrows className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">
              Today&apos;s Goal
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {pagesReadToday} / {dailyGoal} pages
          </span>
        </div>
        <div className="h-3 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        {goalProgress >= 100 && (
          <p className="text-xs text-primary font-medium mt-2">
            Goal achieved! Keep going!
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{pagesReadToday}</p>
          <p className="text-xs text-muted-foreground">Pages today</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <TrendingUp className="w-5 h-5 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">
            {averagePagesPerDay}
          </p>
          <p className="text-xs text-muted-foreground">Avg/day</p>
        </div>
    
      </div>

      {/* Weekly Chart */}
      <div className="p-4 rounded-2xl bg-card border border-border">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          This Week
        </h4>
        <ChartContainer config={chartConfig} className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={weeklyData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pagesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="oklch(0.65 0.18 25)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="oklch(0.65 0.18 25)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="oklch(0.92 0.01 80)"
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "oklch(0.5 0.02 50)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "oklch(0.5 0.02 50)" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="pages"
                stroke="oklch(0.65 0.18 25)"
                strokeWidth={2}
                fill="url(#pagesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}
