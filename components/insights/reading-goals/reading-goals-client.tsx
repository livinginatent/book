/* eslint-disable import/order */
"use client";

import { TrendingUp, AlertTriangle } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { GiTargetArrows } from "react-icons/gi";
import { getGoalInsights } from "@/app/actions/insights";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { GoalCard } from "./goal-card";
import { PaceSummary } from "./pace-summary";
import { cn } from "@/lib/utils";

interface ReadingGoalsClientProps {
  isOpen?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export function ReadingGoalsClient({
  isOpen,
  onLoadingChange,
}: ReadingGoalsClientProps) {
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getGoalInsights>
  > | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (isOpen && !hasFetched) {
      onLoadingChange?.(true);
      startTransition(async () => {
        setError(null);
        const result = await getGoalInsights();
        if (result.success) {
          setData(result);
        } else {
          setError(result.error);
        }
        setHasFetched(true);
        onLoadingChange?.(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, hasFetched]);

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { activeGoals, successRate, paceAlerts } = data;

  if (!isOpen) {
    return null;
  }

  // Map goal types to display labels and units
  function getGoalTypeLabel(type: string): { label: string; unit: string } {
    switch (type) {
      case "books":
        return { label: "Books Goal", unit: "books" };
      case "pages":
        return { label: "Pages Goal", unit: "pages" };
      case "genres":
      case "diversity":
        return { label: "Diversity Goal", unit: "genres" };
      case "consistency":
        return { label: "Consistency Goal", unit: "days" };
      default:
        return { label: "Reading Goal", unit: "" };
    }
  }

  // Convert pace alerts to goal status for PaceSummary
  const goalStatuses = activeGoals.map((goal) => {
    const alert = paceAlerts.find((a) => a.goalId === goal.id);
    let status: "on-track" | "behind" | "crucial" = "on-track";
    if (alert) {
      status = alert.severity === "critical" ? "crucial" : "behind";
    }
    const { label } = getGoalTypeLabel(goal.type);
    return {
      id: goal.id,
      title: label,
      status,
    };
  });

  return (
    <div className="space-y-10">
      {/* Success Rate Card */}
      <DashboardCard
        title="Success Rate"
        description="Your goal completion rate"
        icon={TrendingUp}
      >
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">
                {successRate}%
              </span>
              <span className="text-sm text-muted-foreground">
                completion rate
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on all goals created since account inception
            </p>
          </div>
          <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
              style={{
                transform: `rotate(${(successRate / 100) * 360 - 90}deg)`,
              }}
            />
            <span className="text-2xl font-bold text-primary">{successRate}%</span>
          </div>
        </div>
      </DashboardCard>

      {/* Pace Alerts */}
      {paceAlerts.length > 0 && (
        <DashboardCard
          title="Pace Alerts"
          description="Goals that need attention"
          icon={AlertTriangle}
        >
          <div className="space-y-3">
            {paceAlerts.map((alert) => {
              const { label, unit } = getGoalTypeLabel(alert.goalType);
              return (
                <div
                  key={alert.goalId}
                  className={cn(
                    "p-4 rounded-lg border",
                    alert.severity === "critical"
                      ? "bg-rose-500/10 border-rose-200 dark:border-rose-800"
                      : "bg-amber-500/10 border-amber-200 dark:border-amber-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">{label}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">
                        Required Pace
                      </p>
                      <p className="font-bold text-lg">
                        {alert.requiredDailyPace.toFixed(1)} {unit}/day
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      )}

      {/* Active Goals Grid */}
      {activeGoals.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <GiTargetArrows className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Active Goals
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Track your progress and stay on pace to achieve your reading goals
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGoals.map((goal) => {
              const { label, unit } = getGoalTypeLabel(goal.type);
              return (
                <GoalCard
                  key={goal.id}
                  title={label}
                  current={goal.current}
                  goal={goal.target}
                  unit={unit}
                  progressPercent={goal.progressPercent}
                  timelinePercent={goal.timeElapsedPercent}
                  description={`Ends: ${new Date(goal.endDate).toLocaleDateString()}`}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Pace Summary */}
      {goalStatuses.length > 0 && (
        <section>
          <PaceSummary goals={goalStatuses} />
        </section>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && (
        <div className="p-8 rounded-2xl bg-card border border-border text-center">
          <GiTargetArrows className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No active goals. Create a goal to start tracking your reading progress!
          </p>
        </div>
      )}
    </div>
  );
}

