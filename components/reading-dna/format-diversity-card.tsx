"use client";
import { BookOpen, Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface FormatDiversityProps {
  formats: {
    physical: number;
    digital: number;
    audiobook: number;
  };
  diverseCastPercent: number;
}

export function FormatDiversityCard({
  formats,
  diverseCastPercent,
}: FormatDiversityProps) {
  const total = formats.physical + formats.digital + formats.audiobook;

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
            Your reading format distribution shows how you prefer to consume
            books. The diverse cast percentage reflects the inclusivity of
            characters in your library.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (total === 0) {
    return (
      <DashboardCard
        title="Format & Diversity"
        description="How you read and inclusivity"
        icon={BookOpen}
        action={infoTooltip}
      >
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No format data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Format & Diversity"
      description="How you read and inclusivity"
      icon={BookOpen}
      action={infoTooltip}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Physical Books
            </span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.physical / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.physical / total) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">E-books</span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.digital / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.digital / total) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Audiobooks
            </span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.audiobook / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.audiobook / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Diverse Cast
            </span>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">
                {diverseCastPercent}%
              </p>
              <p className="text-xs text-muted-foreground">of your library</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
