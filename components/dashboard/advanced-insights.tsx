import { LineChart, TrendingUp, Zap, BookMarked } from "lucide-react";

import { DashboardCard } from "@/components/ui/dashboard-card";

interface AdvancedInsightsProps {
  locked?: boolean;
}

export function AdvancedInsights({ locked = false }: AdvancedInsightsProps) {
  return (
    <DashboardCard
      title="Advanced Insights"
      description="Deep dive into your reading patterns"
      icon={LineChart}
      locked={locked}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <TrendingUp className="w-5 h-5 text-accent" />
          <div>
            <p className="font-medium text-sm">Reading Pace</p>
            <p className="text-xs text-muted-foreground">
              You read 23% faster on weekends
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <Zap className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-sm">Best Reading Time</p>
            <p className="text-xs text-muted-foreground">
              You&apos;re most focused between 9-11 PM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <BookMarked className="w-5 h-5 text-chart-3" />
          <div>
            <p className="font-medium text-sm">Genre Affinity</p>
            <p className="text-xs text-muted-foreground">
              You finish mystery books 2x faster
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
