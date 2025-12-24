import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PaceIndicatorProps {
  status: "ahead" | "on_track" | "behind";
  difference: number;
  catchUpRate?: number;
  unit?: string;
}

export function PaceIndicator({
  status,
  difference,
  catchUpRate,
  unit = "books",
}: PaceIndicatorProps) {
  const absDifference = Math.abs(difference);

  // Determine the unit for catch-up rate message
  const catchUpUnit = unit === "pages" ? "pages" : 
                      unit === "genres" ? "genres" :
                      unit === "days" ? "days" : "books";

  const statusConfig = {
    ahead: {
      icon: TrendingUp,
      className: "text-success",
      bgClassName: "bg-success/10",
      message: `${absDifference} ${unit} ahead of schedule`,
    },
    on_track: {
      icon: Minus,
      className: "text-muted-foreground",
      bgClassName: "bg-muted",
      message: "Right on track!",
    },
    behind: {
      icon: TrendingDown,
      className: "text-warning",
      bgClassName: "bg-warning/10",
      message: catchUpRate
        ? `${absDifference} ${unit} behind. Read ${catchUpRate} ${catchUpUnit}/day to catch up`
        : `${absDifference} ${unit} behind schedule`,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
        config.bgClassName
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", config.className)} />
      <span className={cn("font-medium", config.className)}>
        {config.message}
      </span>
    </div>
  );
}
