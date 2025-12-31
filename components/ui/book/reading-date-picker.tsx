"use client";

import { Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReadingDates {
  startDate: string;
  finishDate: string;
}

interface ReadingDatePickerProps {
  startDate: string;
  finishDate: string;
  onStartDateChange: (date: string) => void;
  onFinishDateChange: (date: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  showStartDate?: boolean;
  title?: string;
  className?: string;
}

/**
 * Reusable date picker component for reading dates (start and finish)
 */
export function ReadingDatePicker({
  startDate,
  finishDate,
  onStartDateChange,
  onFinishDateChange,
  onConfirm,
  onCancel,
  showStartDate = true,
  title = "When did you read this book?",
  className,
}: ReadingDatePickerProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>

      <div className="space-y-3">
        {/* Start Date */}
        {showStartDate && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">
              Started reading (default is when it was added to your library)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className={cn(
                "w-full px-3 py-2 rounded-lg border border-border",
                "bg-background text-foreground text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "transition-all"
              )}
              max={finishDate || today}
            />
          </div>
        )}

        {/* Finish Date */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Finished reading
          </label>
          <input
            type="date"
            value={finishDate}
            onChange={(e) => onFinishDateChange(e.target.value)}
            className={cn(
              "w-full px-3 py-2 rounded-lg border border-border",
              "bg-background text-foreground text-sm",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "transition-all"
            )}
            min={startDate || undefined}
            max={today}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={onConfirm} size="sm" className="flex-1 rounded-xl">
          Confirm
        </Button>
        <Button
          onClick={onCancel}
          size="sm"
          variant="outline"
          className="flex-1 rounded-xl"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/**
 * Hook to manage reading date picker state
 */
export function useReadingDates() {
  const today = new Date().toISOString().split("T")[0];

  const getInitialDates = (): ReadingDates => ({
    startDate: "",
    finishDate: today,
  });

  const resetDates = (): ReadingDates => getInitialDates();

  const convertToISO = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  };

  return {
    getInitialDates,
    resetDates,
    convertToISO,
    today,
  };
}

