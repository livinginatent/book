"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShelfHeaderProps {
  shelfName: string;
  bookCount: number;
  onSortChange?: (sort: "progress" | "added" | "title" | "neglected" | "oldest" | "newest" | "shortest") => void;
  onViewChange?: (view: "grid" | "list") => void;
  currentSort?: "progress" | "added" | "title" | "neglected" | "oldest" | "newest" | "shortest";
  sortOptions?: Array<{ value: string; label: string }>;
}

const DEFAULT_SORT_OPTIONS = [
  { value: "progress", label: "Progress" },
  { value: "neglected", label: "Neglected" },
  { value: "added", label: "Recently Added" },
  { value: "title", label: "Title" },
] as const;

export function ShelfHeader({
  shelfName,
  bookCount,
  onSortChange,
  onViewChange,
  currentSort = "progress",
  sortOptions = DEFAULT_SORT_OPTIONS,
}: ShelfHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/authenticated-home"
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {shelfName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bookCount} books in progress
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Controls - Mobile Responsive */}
        <div className="space-y-3">
          {/* Sort by label - on top for mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Sort by:
            </span>
            {/* Filters in 2x2 grid on mobile, horizontal on desktop */}
            <div className="grid grid-cols-2 sm:flex gap-1 bg-muted rounded-lg p-1 w-full sm:w-auto">
              {sortOptions.map((option) => {
                const isActive = currentSort === option.value;
                return (
                  <Button
                    key={option.value}
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onSortChange?.(
                        option.value as
                          | "progress"
                          | "added"
                          | "title"
                          | "neglected"
                          | "oldest"
                          | "newest"
                          | "shortest"
                      )
                    }
                    className={cn(
                      "rounded-lg text-xs flex-1 sm:flex-none",
                      isActive &&
                        "bg-background text-foreground shadow-sm font-medium"
                    )}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
