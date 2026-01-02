"use client";

import { Skeleton } from "./skeleton";


export function MoodTrackerSkeleton() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Your recent reading moods:
      </p>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <div className="h-40 flex items-center justify-center">
        <Skeleton className="w-32 h-32 rounded-full" />
      </div>
      <div className="flex items-center justify-center">
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
    </div>
  );
}
