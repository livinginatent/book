"use client";

import { cn } from "@/lib/utils";
import { Gauge, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DailyAverageCardProps {
  pagesPerDay: number;
  weeklyTotal: number;
  rangeLabel?: string;
  className?: string;
}

export function DailyAverageCard({
  pagesPerDay,
  weeklyTotal,
  rangeLabel,
  className,
}: DailyAverageCardProps) {
  // Categorize reading pace
  const getPaceCategory = () => {
    if (pagesPerDay >= 50) return { label: "Speed Reader", color: "text-emerald-500" };
    if (pagesPerDay >= 30) return { label: "Strong Pace", color: "text-blue-500" };
    if (pagesPerDay >= 15) return { label: "Steady Reader", color: "text-amber-500" };
    if (pagesPerDay > 0) return { label: "Light Reading", color: "text-muted-foreground" };
    return { label: "Getting Started", color: "text-muted-foreground" };
  };

  const pace = getPaceCategory();

  return (
    <div
      className={cn("p-6 rounded-2xl bg-card border border-border", className)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Velocity Engine</h3>
            <p className="text-xs text-muted-foreground">
              {rangeLabel ? `${rangeLabel} average` : "30-day rolling average"}
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>The Velocity Engine</strong> calculates your current reading pace 
                using the average pages per day from your selected time range. 
                This powers your book completion forecasts.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-3 mt-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Pages Per Day</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-foreground">{pagesPerDay}</p>
            <p className="text-sm text-muted-foreground">pages/day</p>
          </div>
          <p className={cn("text-xs font-medium mt-1", pace.color)}>{pace.label}</p>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Last 7 Days</p>
          <p className="text-lg font-semibold text-foreground">
            {weeklyTotal.toLocaleString()} pages
          </p>
        </div>
      </div>
    </div>
  );
}
