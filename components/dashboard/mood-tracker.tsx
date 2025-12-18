import { Heart } from "lucide-react";

import { DashboardCard } from "@/components/ui/dashboard-card";
import { MoodTag } from "@/components/ui/mood-tag";

interface MoodTrackerProps {
  locked?: boolean;
}

export function MoodTracker({ locked = false }: MoodTrackerProps) {
  const moods = [
    { mood: "Adventurous", color: "coral" as const },
    { mood: "Cozy", color: "yellow" as const },
    { mood: "Thoughtful", color: "teal" as const },
    { mood: "Escapist", color: "purple" as const },
  ];

  return (
    <DashboardCard
      title="Mood & Pace Tracking"
      description="How your books make you feel"
      icon={Heart}
      locked={locked}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your recent reading moods:
        </p>
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <MoodTag key={m.mood} mood={m.mood} color={m.color} />
          ))}
        </div>
        <div className="h-24 bg-muted/30 rounded-xl flex items-center justify-center">
          <span className="text-sm text-muted-foreground">
            Mood timeline chart
          </span>
        </div>
      </div>
    </DashboardCard>
  );
}
