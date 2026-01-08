import { Zap, Calendar, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface PaceCalculatorProps {
  pagesRemaining: number;
  averagePagesPerDay: number;
  currentStreak: number;
  className?: string;
}

export function PaceCalculator({
  pagesRemaining,
  averagePagesPerDay,
  currentStreak,
  className,
}: PaceCalculatorProps) {
  const hasNotStarted = averagePagesPerDay === 0;
  const daysToFinish =
    averagePagesPerDay > 0 ? Math.ceil(pagesRemaining / averagePagesPerDay) : 0;
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + daysToFinish);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-accent/10 border border-accent/20",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-accent" />
        <h4 className="font-semibold text-foreground">Pace Calculator</h4>
      </div>

      {hasNotStarted ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            You haven&apos;t started reading yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Update your progress to see estimates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Pages remaining
            </span>
            <span className="font-semibold text-foreground">
              {pagesRemaining}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Your daily average
            </span>
            <span className="font-semibold text-foreground">
              {averagePagesPerDay} pages
            </span>
          </div>

          <div className="h-px bg-border my-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">
                Estimated finish
              </span>
            </div>
            <span className="font-bold text-accent">
              {daysToFinish} days ({formatDate(finishDate)})
            </span>
          </div>

          {currentStreak >= 3 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>
                Keep your {currentStreak}-day streak to finish on time!
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
