"use client";

import { ArrowLeft, ChevronDown, Share2 } from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShelfHeaderProps {
  shelfName: string;
  bookCount: number;
  onSortChange?: (
    sort:
      | "progress"
      | "added"
      | "title"
      | "neglected"
      | "oldest"
      | "newest"
      | "shortest"
  ) => void;
  onViewChange?: (view: "grid" | "list") => void;
  currentSort?:
    | "progress"
    | "added"
    | "title"
    | "neglected"
    | "oldest"
    | "newest"
    | "shortest";
  sortOptions?: readonly { value: string; label: string }[];
  onYearChange?: (year: number | null) => void;
  currentYear?: number | null;
  onShareYear?: () => void;
  isPremium?: boolean;
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
  onViewChange: _onViewChange,
  currentSort = "progress",
  sortOptions = DEFAULT_SORT_OPTIONS,
  onYearChange,
  currentYear,
  onShareYear,
  isPremium = false,
}: ShelfHeaderProps) {
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const currentYearValue = new Date().getFullYear();
  const lastYearValue = currentYearValue - 1;

  const yearOptions = [
    { label: "Current Year", value: currentYearValue },
    { label: "Last Year", value: lastYearValue },
    { label: "All Time", value: null },
  ];

  const selectedYearLabel =
    currentYear === currentYearValue
      ? "Current Year"
      : currentYear === lastYearValue
      ? "Last Year"
      : "All Time";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        yearDropdownRef.current &&
        !yearDropdownRef.current.contains(event.target as Node)
      ) {
        setShowYearDropdown(false);
      }
    }

    if (showYearDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showYearDropdown]);

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {shelfName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {bookCount} {bookCount === 1 ? "book" : "books"}
              </p>
            </div>
          </div>
          {onShareYear && isPremium && (
            <Button
              onClick={onShareYear}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share My Year
            </Button>
          )}
        </div>

        {/* Filters & Controls - Mobile Responsive */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
            {/* Year Filter */}
            {onYearChange && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Year:
                </span>
                <div className="relative" ref={yearDropdownRef}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
                    className="gap-2 min-w-[140px] justify-between"
                  >
                    {selectedYearLabel}
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        showYearDropdown && "rotate-180"
                      )}
                    />
                  </Button>
                  {showYearDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      {yearOptions.map((option) => (
                        <button
                          key={option.value ?? "all"}
                          onClick={() => {
                            onYearChange(option.value);
                            setShowYearDropdown(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
                            currentYear === option.value &&
                              "bg-accent font-medium"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sort by label - on top for mobile */}
            {sortOptions.length > 0 && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
