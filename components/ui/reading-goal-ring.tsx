"use client";

import { cn } from "@/lib/utils";

interface ReadingGoalRingProps {
  current: number;
  target: number;
  className?: string;
}

export function ReadingGoalRing({
  current,
  target,
  className,
}: ReadingGoalRingProps) {
  const percentage = Math.min((current / target) * 100, 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-primary transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{current}</span>
          <span className="text-sm text-muted-foreground">of {target}</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center">
        {target - current > 0
          ? `${target - current} books to go!`
          : "Goal reached!"}
      </p>
    </div>
  );
}
