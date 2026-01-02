"use client";

import { Flame, Info } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  currentStreak: number;
  bestStreak: number;
  className?: string;
}

export function StreakCard({
  currentStreak,
  bestStreak,
  className,
}: StreakCardProps) {
  const isOnFire = currentStreak >= 7;
  const isWarming = currentStreak >= 3 && currentStreak < 7;

  return (
    <div
      className={cn(
        "p-6 rounded-2xl bg-card border border-border relative overflow-hidden",
        isOnFire && "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent",
        className
      )}
    >
      {/* Ambient glow for active streaks */}
      {isOnFire && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
      )}

      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isOnFire ? "bg-orange-500/20 text-orange-500" : "bg-primary/10 text-primary"
            )}>
              <Flame className={cn("w-6 h-6", isOnFire && "animate-pulse")} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Reading Streak</h3>
              <p className="text-xs text-muted-foreground">Don't break the chain</p>
            </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>The Streak</strong> counts consecutive days you've read at least one page. 
                Keep it going to build lasting reading habits!
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Streak</p>
            <div className="flex items-baseline gap-2">
              <p className={cn(
                "text-4xl font-bold",
                isOnFire ? "text-orange-500" : isWarming ? "text-amber-500" : "text-foreground"
              )}>
                {currentStreak}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentStreak === 1 ? "day" : "days"}
              </p>
            </div>
            {isOnFire && (
              <p className="text-xs text-orange-500 font-medium mt-1">🔥 You're on fire!</p>
            )}
            {isWarming && (
              <p className="text-xs text-amber-500 font-medium mt-1">⚡ Building momentum!</p>
            )}
            {currentStreak === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Read today to start a streak</p>
            )}
          </div>
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Personal Best</p>
            <p className="text-lg font-semibold text-foreground">{bestStreak} days</p>
          </div>
        </div>
      </div>
    </div>
  );
}
