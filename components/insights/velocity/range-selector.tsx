"use client";

import { cn } from "@/lib/utils";
import type { VelocityRange } from "@/app/actions/insights";

interface RangeOption {
  value: VelocityRange;
  label: string;
  description: string;
}

const ranges: RangeOption[] = [
  {
    value: "30days",
    label: "Last 30 Days",
    description: "Focus on current habit",
  },
  {
    value: "ytd",
    label: "Year to Date",
    description: "Focus on annual goals",
  },
  {
    value: "alltime",
    label: "All Time",
    description: "Focus on legacy stats",
  },
];

interface RangeSelectorProps {
  value: VelocityRange;
  onChange: (range: VelocityRange) => void;
  className?: string;
}

export function RangeSelector({
  value,
  onChange,
  className,
}: RangeSelectorProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            "flex-1 px-4 py-3 rounded-xl border transition-all text-left",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
            value === range.value
              ? "bg-primary/10 border-primary/30 text-foreground shadow-sm"
              : "bg-background border-border text-muted-foreground hover:border-primary/20"
          )}
        >
          <div className="font-medium text-sm">{range.label}</div>
          <div className="text-xs mt-0.5 opacity-70">{range.description}</div>
        </button>
      ))}
    </div>
  );
}





