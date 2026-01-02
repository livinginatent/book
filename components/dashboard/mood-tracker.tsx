"use client";

import { Heart, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { MoodSummaryData } from "@/app/actions/dashboard-data";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { MoodTag } from "@/components/ui/mood-tag";

import { MoodRadarChart } from "../ui/mood-radar-chart";

interface MoodTrackerProps {
  locked?: boolean;
  initialData?: MoodSummaryData;
}

// Map server action colors to MoodTag colors
function mapColorToMoodTagColor(
  serverColor: string
): "coral" | "teal" | "purple" | "yellow" {
  const colorMap: Record<string, "coral" | "teal" | "purple" | "yellow"> = {
    purple: "purple",
    yellow: "yellow",
    pink: "coral",
    red: "coral",
    blue: "teal",
    green: "teal",
    indigo: "purple",
    orange: "coral",
    amber: "yellow",
    gray: "teal",
  };
  return colorMap[serverColor] || "coral";
}

export function MoodTracker({ locked = false, initialData }: MoodTrackerProps) {
  // Use pre-fetched data directly - no client-side loading needed!
  const moodData = initialData;

  const hasEnoughData = moodData?.hasEnoughData ?? false;
  const currentVibe = moodData?.pacing ? `${moodData.pacing}-Paced` : null;

  return (
    <DashboardCard
      title="Mood & Pace Tracking"
      description="How your books make you feel"
      icon={Heart}
      locked={locked}
    >
      <div className="space-y-4">
        {hasEnoughData && moodData ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your recent reading moods:
            </p>
            <div className="flex flex-wrap gap-2">
              {moodData.moods.map((m) => (
                <MoodTag
                  key={m.mood}
                  mood={m.mood}
                  color={mapColorToMoodTagColor(m.color)}
                />
              ))}
            </div>
            <div className="relative">
              <MoodRadarChart
                data={moodData.moods.map((m, index) => ({
                  mood: m.mood,
                  value: 100 - index * 5, // Simple value distribution for visualization
                }))}
                themeColor="emerald-500"
              />
              {currentVibe && (
                <div className="absolute top-2 left-2">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    Current Vibe: {currentVibe}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground mb-4">
                Your Reading DNA is forming. Tag & rate your books with a Moods
                and Pace to see your reading DNA.
              </p>
            </div>
          </div>
        )}

        {!locked && hasEnoughData && (
          <Link href="/advanced-insights">
            <Button variant="outline" className="w-full gap-2" size="sm">
              View Full DNA
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </DashboardCard>
  );
}
