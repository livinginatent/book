"use client";

import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeatmapDay {
  date: string;
  pages: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
  maxPages?: number;
  className?: string;
}

export function ActivityHeatmap({
  data,
  maxPages = 100,
  className,
}: ActivityHeatmapProps) {
  // Calculate stats for the description
  const activeDays = data.filter((d) => d.pages > 0).length;
  const totalPages = data.reduce((sum, d) => sum + d.pages, 0);

  // Group data by weeks
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(
      weekStart.getDate() - (weekStart.getDay() + 51 * 7) + i * 7
    );
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + dayIndex);
      const dateStr = date.toISOString().split("T")[0];
      return (
        data.find((d) => d.date === dateStr) || { date: dateStr, pages: 0 }
      );
    });
  });

  const getColor = (pages: number): string => {
    if (pages === 0) return "bg-muted";
    if (pages < maxPages * 0.25) return "bg-primary/20";
    if (pages < maxPages * 0.5) return "bg-primary/40";
    if (pages < maxPages * 0.75) return "bg-primary/70";
    return "bg-primary";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Month labels - show at the start of the week containing the 1st of each month
  const monthLabels: { month: string; weekIndex: number }[] = [];
  const seenMonths = new Set<number>();

  weeks.forEach((week, weekIndex) => {
    // Check if this week contains the 1st of any month
    const hasFirstOfMonth = week.some((day) => {
      const date = new Date(day.date);
      return date.getDate() === 1;
    });

    if (hasFirstOfMonth) {
      // Find the first day of the month in this week
      const firstDay = week.find((day) => {
        const date = new Date(day.date);
        return date.getDate() === 1;
      });

      if (firstDay) {
        const date = new Date(firstDay.date);
        const month = date.getMonth();

        if (!seenMonths.has(month)) {
          monthLabels.push({
            month: date.toLocaleDateString("en-US", {
              month: "short",
            }),
            weekIndex,
          });
          seenMonths.add(month);
        }
      }
    }
  });

  return (
    <div
      className={cn("p-6 rounded-2xl bg-card border border-border", className)}
    >
      {/* Header with description */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-foreground">
            12-Month Reading Activity
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your visual proof of work — every colored square is a day you read
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>The Heatmap</strong> is your visual &quot;proof of
                work&quot; — a GitHub-style grid showing the last 12 months of
                reading activity. Darker squares mean more pages read that day.
                Hover over any square to see the details.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats summary */}
      <div className="flex gap-6 text-sm mb-6 mt-4">
        <div>
          <span className="text-muted-foreground">Active days: </span>
          <span className="font-semibold text-foreground">{activeDays}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total pages: </span>
          <span className="font-semibold text-foreground">
            {totalPages.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Month labels */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div
            className="relative mb-1 ml-8"
            style={{
              height: "16px",
              width: `${weeks.length * 16}px`,
            }}
          >
            {monthLabels.map((m, i) => {
              // Each week column is 12px (w-3) + 4px gap = 16px
              const weekWidth = 16;
              const position = m.weekIndex * weekWidth;
              const nextPosition =
                i < monthLabels.length - 1
                  ? monthLabels[i + 1].weekIndex * weekWidth
                  : weeks.length * weekWidth;
              const width = nextPosition - position;

              return (
                <div
                  key={i}
                  className="absolute text-xs text-muted-foreground"
                  style={{
                    left: `${position}px`,
                    width: `${width}px`,
                  }}
                >
                  {m.month}
                </div>
              );
            })}
          </div>

          {/* Day labels + Grid */}
          <div className="flex gap-1">
            {/* Day of week labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
              <div className="h-3" />
              <div className="h-3 flex items-center">Mon</div>
              <div className="h-3" />
              <div className="h-3 flex items-center">Wed</div>
              <div className="h-3" />
              <div className="h-3 flex items-center">Fri</div>
              <div className="h-3" />
            </div>

            {/* Heatmap grid */}
            <TooltipProvider>
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day) => (
                      <Tooltip key={day.date}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 hover:scale-125",
                              getColor(day.pages)
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          <div className="font-medium">
                            {formatDate(day.date)}
                          </div>
                          <div
                            className={cn(
                              "font-semibold",
                              day.pages > 0
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {day.pages > 0
                              ? `${day.pages} pages`
                              : "No reading"}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Hover over squares to see daily details
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-primary/20" />
            <div className="w-3 h-3 rounded-sm bg-primary/40" />
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
