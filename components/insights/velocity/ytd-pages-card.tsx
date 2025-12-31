"use client";

import { cn } from "@/lib/utils";
import { Calendar, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface YtdPagesCardProps {
  totalPages: number;
  booksFinished: number;
  className?: string;
}

export function YtdPagesCard({
  totalPages,
  booksFinished,
  className,
}: YtdPagesCardProps) {
  const currentYear = new Date().getFullYear();
  const dayOfYear = Math.floor(
    (Date.now() - new Date(currentYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const avgPagesThisYear = dayOfYear > 0 ? Math.round(totalPages / dayOfYear) : 0;

  return (
    <div
      className={cn("p-6 rounded-2xl bg-card border border-border", className)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">YTD Performance</h3>
            <p className="text-xs text-muted-foreground">Since Jan 1, {currentYear}</p>
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
                <strong>Year-to-Date Performance</strong> tracks your cumulative reading 
                from January 1st to right now. Watch these numbers grow throughout the year!
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-3 mt-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Total Pages Read</p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-bold text-foreground">
              {totalPages.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">pages</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ~{avgPagesThisYear} pages/day avg
          </p>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Books Completed</p>
          <p className="text-lg font-semibold text-emerald-500">
            {booksFinished} {booksFinished === 1 ? "book" : "books"}
          </p>
        </div>
      </div>
    </div>
  );
}
