"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BookMarked } from "lucide-react";

interface StructuralPreferencesProps {
  plotDriven: number;
  characterDriven: number;
}

export function StructuralPreferencesCard({
  plotDriven,
  characterDriven,
}: StructuralPreferencesProps) {
  const total = plotDriven + characterDriven;
  const plotPercent = Math.round((plotDriven / total) * 100);
  const charPercent = Math.round((characterDriven / total) * 100);

  return (
    <DashboardCard
      title="Structural Preferences"
      description="Your reading identity"
      icon={BookMarked}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Plot-Driven
            </span>
            <span className="text-sm font-semibold text-accent">
              {plotPercent}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
              style={{ width: `${plotPercent}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Character-Driven
            </span>
            <span className="text-sm font-semibold text-accent">
              {charPercent}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
              style={{ width: `${charPercent}%` }}
            />
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
