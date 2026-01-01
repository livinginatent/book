"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BookOpen } from "lucide-react";

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

  return (
    <DashboardCard
      title="Format & Diversity"
      description="How you read and inclusivity"
      icon={BookOpen}
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
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
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
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
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
              className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
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
