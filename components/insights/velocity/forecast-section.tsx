"use client";

import { cn } from "@/lib/utils";
import { CalendarClock, Info, Sparkles } from "lucide-react";
import { BookForecastCard } from "./book-forecast-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForecastBook {
  id: string;
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  pagesPerDay: number;
  estimatedFinish: string;
}

interface ForecastSectionProps {
  books: ForecastBook[];
  className?: string;
}

export function ForecastSection({ books, className }: ForecastSectionProps) {
  // Calculate the soonest completion
  const soonestBook = books.length > 0
    ? books.reduce((prev, curr) => {
        const prevDays = Math.ceil((prev.totalPages - prev.currentPage) / prev.pagesPerDay);
        const currDays = Math.ceil((curr.totalPages - curr.currentPage) / curr.pagesPerDay);
        return currDays < prevDays ? curr : prev;
      })
    : null;

  const soonestDays = soonestBook
    ? Math.ceil((soonestBook.totalPages - soonestBook.currentPage) / soonestBook.pagesPerDay)
    : 0;

  return (
    <div
      className={cn("p-6 rounded-2xl bg-card border border-border", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Completion Forecast</h3>
            <p className="text-sm text-muted-foreground">
              When you'll finish your current books
            </p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-xs">
                <strong>The Forecast</strong> answers the question: "If I keep reading 
                at my current pace, exactly when will I finish each book?" Predictions 
                are based on your selected time range velocity average.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Quick insight */}
      {soonestBook && soonestDays > 0 && (
        <div className="flex items-center gap-2 mt-4 mb-6 p-3 rounded-xl bg-violet-500/5 border border-violet-500/20">
          <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
          <p className="text-sm text-foreground">
            At your current pace, you'll finish{" "}
            <span className="font-semibold">{soonestBook.title}</span>{" "}
            in <span className="font-semibold text-violet-500">{soonestDays} days</span>
          </p>
        </div>
      )}

      {/* Book cards */}
      {books.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
            <CalendarClock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No books in progress
          </p>
          <p className="text-sm text-muted-foreground">
            Start reading a book to see your completion forecast
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookForecastCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
