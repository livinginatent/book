import { BarChart3, Clock, BookOpen, Calendar } from "lucide-react";

import { DashboardCard } from "@/components/ui/dashboard-card";
import { StatCard } from "@/components/ui/stat-card";

interface ReadingStatsProps {
  booksRead: number;
  pagesRead: number;
  readingStreak: number;
  avgPagesPerDay: number;
}

export function ReadingStats({
  booksRead,
  pagesRead,
  readingStreak,
  avgPagesPerDay,
}: ReadingStatsProps) {
  return (
    <DashboardCard
      title="Reading Stats"
      description="Your reading journey this year"
      icon={BarChart3}
    >
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={BookOpen}
          value={String(booksRead)}
          label="Books Read"
        />
        <StatCard
          icon={Calendar}
          value={String(pagesRead)}
          label="Pages Read"
        />
        <StatCard
          icon={Clock}
          value={`${readingStreak} days`}
          label="Reading Streak"
        />
        <StatCard
          icon={BarChart3}
          value={String(avgPagesPerDay)}
          label="Avg Pages/Day"
        />
      </div>
    </DashboardCard>
  );
}
