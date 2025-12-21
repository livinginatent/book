import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface ReadingStreakProps {
  currentStreak: number;
  longestStreak: number;
  weekData: { day: string; active: boolean }[];
  className?: string;
}

export function ReadingStreak({
  currentStreak,
  longestStreak,
  weekData,
  className,
}: ReadingStreakProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {currentStreak}
            </p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground">
            Best: {longestStreak} days
          </p>
        </div>
      </div>

      <div className="flex justify-between gap-1">
        {weekData.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all",
                day.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {day.active && <Flame className="w-4 h-4" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
