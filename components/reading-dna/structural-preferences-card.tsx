"use client";

import { BookMarked, Info } from "lucide-react";

import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StructuralPreferencesProps {
  structuralFlags: Array<{
    key: string;
    percentage: number;
  }>;
}

// Map attribute keys to display labels matching book-review-form.tsx
const ATTRIBUTE_LABELS: Record<string, string> = {
  plot_driven: "Plot-Driven",
  character_development: "Character Development",
  diverse_cast: "Diverse Cast",
  multiple_pov: "Multiple POV",
  world_building: "World-Building",
  twist_ending: "Twist Ending",
  strong_prose: "Strong Prose",
};

export function StructuralPreferencesCard({
  structuralFlags,
}: StructuralPreferencesProps) {
  // Filter and sort flags by percentage (highest first)
  const sortedFlags = structuralFlags
    .filter((flag) => ATTRIBUTE_LABELS[flag.key])
    .sort((a, b) => b.percentage - a.percentage);

  const infoTooltip = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-xs">
            The structural elements you gravitate toward in books. These
            percentages show how often you encounter and enjoy specific
            narrative features across your reading history.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (sortedFlags.length === 0) {
    return (
      <DashboardCard
        title="Structural Preferences"
        description="Your reading identity"
        icon={BookMarked}
        action={infoTooltip}
      >
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No preference data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Structural Preferences"
      description="Your reading identity"
      icon={BookMarked}
      action={infoTooltip}
    >
      <div className="space-y-4">
        {sortedFlags.map((flag) => {
          const label = ATTRIBUTE_LABELS[flag.key] || flag.key;
          const percentage = Math.round(flag.percentage);

          return (
            <div key={flag.key}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
                <span className="text-sm font-semibold text-accent">
                  {percentage}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
