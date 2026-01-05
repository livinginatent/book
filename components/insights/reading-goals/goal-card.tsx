"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Zap } from "lucide-react";

interface GoalCardProps {
  title: string;
  current: number;
  goal: number;
  unit: string;
  progressPercent: number;
  timelinePercent: number;
  description?: string;
}

export function GoalCard({
  title,
  current,
  goal,
  unit,
  progressPercent,
  timelinePercent,
  description,
}: GoalCardProps) {
  return (
    <DashboardCard title={title} description={description} icon={Zap}>
      <div className="space-y-4">
        {/* Progress stats */}
        <div className="flex justify-between text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Progress
            </p>
            <p className="font-semibold text-lg">
              {current} / {goal} {unit}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs uppercase tracking-wider">
              Target Pace
            </p>
            <p className="font-semibold text-lg">
              {timelinePercent.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Progress bar with dual indicators */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          {/* Actual progress (emerald) */}
          <div
            className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Timeline indicator (vertical marker) */}
          <div
            className="absolute top-0 h-full w-1 bg-primary/60 rounded-full transition-all duration-500"
            style={{
              left: `${timelinePercent}%`,
              transform: "translateX(-50%)",
            }}
            title={`You should be at ${timelinePercent.toFixed(0)}% by now`}
          />
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-muted-foreground">Actual Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-3 bg-primary/60 rounded-full" />
            <span className="text-muted-foreground">Expected by Today</span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
