"use client";
import { Info, Sparkles } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface WinningComboProps {
  combo: {
    description: string;
    avgRating: number;
    bookCount: number;
  };
}

export function WinningComboCard({ combo }: WinningComboProps) {
  return (
    <DashboardCard
      title="Your Sweet Spot"
      description="Highest-rated book combo"
      icon={Sparkles}
      className="col-span-full lg:col-span-1"
      action={
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                The perfect combination of genre and pacing that consistently
                earns your highest ratings. This is your reading sweet spot —
                books that match this profile are most likely to be 5-star reads
                for you.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">{combo.description}</p>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {combo.avgRating.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Books</p>
              <p className="text-2xl font-bold text-emerald-600">
                {combo.bookCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
