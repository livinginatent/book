"use client";

import { cn } from "@/lib/utils";
import { BookMarked } from "lucide-react";

interface ForecastBook {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  pagesPerDay: number;
  estimatedFinish: string;
}

interface BookForecastCardProps {
  book: ForecastBook;
  className?: string;
}

export function BookForecastCard({ book, className }: BookForecastCardProps) {
  const progress = (book.currentPage / book.totalPages) * 100;
  const daysRemaining = Math.ceil(
    (book.totalPages - book.currentPage) / book.pagesPerDay
  );

  return (
    <div
      className={cn(
        "p-5 rounded-xl bg-muted/50 border border-border",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground text-sm line-clamp-2">
            {book.title}
          </h4>
          <p className="text-xs text-muted-foreground">{book.author}</p>
        </div>
        <BookMarked className="w-5 h-5 text-accent shrink-0" />
      </div>

      <div className="space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">
              {book.currentPage} / {book.totalPages} pages
            </span>
            <span className="text-xs font-semibold text-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Estimated finish */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">
            Estimated Completion
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-semibold text-foreground">
              {new Date(book.estimatedFinish).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              ~{daysRemaining} days • {book.pagesPerDay} pages/day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
