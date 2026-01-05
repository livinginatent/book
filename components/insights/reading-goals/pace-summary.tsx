"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = "on-track" | "behind" | "crucial";

interface GoalStatus {
  id: string;
  title: string;
  status: StatusType;
}

interface PaceSummaryProps {
  goals: GoalStatus[];
}

const statusConfig = {
  "on-track": {
    badge: "On Track",
    color:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  behind: {
    badge: "Slightly Behind",
    color:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  crucial: {
    badge: "Crucial Catch-up Needed",
    color:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  },
};

export function PaceSummary({ goals }: PaceSummaryProps) {
  return (
    <DashboardCard
      title="Pace Summary"
      description="Active goals status"
      icon={Gauge}
    >
      <div className="space-y-3">
        {goals.map((goal) => {
          const config = statusConfig[goal.status];
          return (
            <div
              key={goal.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <p className="font-medium text-sm">{goal.title}</p>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
                  config.color
                )}
              >
                {config.badge}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
