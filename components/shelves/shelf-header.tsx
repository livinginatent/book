"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ShelfHeaderProps {
  shelfName: string;
  bookCount: number;
  onSortChange?: (sort: "progress" | "added" | "title") => void;
  onViewChange?: (view: "grid" | "list") => void;
}

export function ShelfHeader({
  shelfName,
  bookCount,
  onSortChange,
  onViewChange,
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

        {/* Filters & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {[
                { value: "progress", label: "Progress" },
                { value: "added", label: "Recently Added" },
                { value: "title", label: "Title" },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onSortChange?.(
                      option.value as "progress" | "added" | "title"
                    )
                  }
                  className="rounded-lg text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
