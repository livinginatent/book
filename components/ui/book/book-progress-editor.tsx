/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  X,
  Check,
  BookOpen,
  Pause,
  XCircle,
  Trash2,
  Minus,
  Plus,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BookStatus =
  | "reading"
  | "finished"
  | "paused"
  | "did-not-finish"
  | "remove";

interface BookProgressEditorProps {
  currentPages: number;
  totalPages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pages: number) => void;
  onStatusChange: (status: BookStatus, date?: string) => void;
  className?: string;
}

const statusActions = [
  {
    status: "finished" as BookStatus,
    label: "Finished",
    icon: Check,
    color: "bg-accent text-accent-foreground hover:bg-accent/90",
  },
  {
    status: "paused" as BookStatus,
    label: "Paused",
    icon: Pause,
    color: "bg-chart-4 text-foreground hover:bg-chart-4/90",
  },
  {
    status: "did-not-finish" as BookStatus,
    label: "DNF",
    icon: XCircle,
    color: "bg-chart-3 text-primary-foreground hover:bg-chart-3/90",
  },
  {
    status: "remove" as BookStatus,
    label: "Remove",
    icon: Trash2,
    color: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
];

export function BookProgressEditor({
  currentPages,
  totalPages,
  isOpen,
  onClose,
  onSave,
  onStatusChange,
  className,
}: BookProgressEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [pages, setPages] = useState(currentPages);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [finishedDate, setFinishedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const progress = totalPages > 0 ? Math.round((pages / totalPages) * 100) : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowDatePicker(false);
      setFinishedDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const handleIncrement = (amount: number) => {
    setPages((prev) => Math.min(totalPages, Math.max(0, prev + amount)));
  };

  const handleSave = () => {
    onSave(pages);
    onClose();
  };

  const handleStatusChange = (status: BookStatus) => {
    if (status === "finished") {
      setShowDatePicker(true);
    } else {
      onStatusChange(status);
      onClose();
    }
  };

  const handleDateConfirm = () => {
    // Convert date string to ISO string (end of day in user's timezone)
    const date = new Date(finishedDate);
    date.setHours(23, 59, 59, 999);
    onStatusChange("finished", date.toISOString());
    onClose();
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end sm:items-center justify-center",
        "bg-black/40 backdrop-blur-sm",
        "p-2 sm:p-4"
      )}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "relative w-full max-w-md",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "animate-in fade-in-50 zoom-in-95 duration-200",
          "overflow-hidden",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Update Progress</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="flex flex-col gap-4 p-4">
          {/* Progress Ring */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  className="stroke-primary transition-all duration-300"
                  strokeWidth="3"
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">
                  {progress}%
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Enter pages read out of {totalPages || "?"}
            </div>
          </div>

          {/* Page Counter */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleIncrement(-10)}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[100px]">
              <span className="text-2xl font-bold text-foreground">
                {pages}
              </span>
              <span className="text-muted-foreground text-sm">
                {" "}
                / {totalPages}
              </span>
            </div>
            <button
              onClick={() => handleIncrement(10)}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Add Buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {[1, 5, 25, 50].map((amount) => (
              <button
                key={amount}
                onClick={() => handleIncrement(amount)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                +{amount}
              </button>
            ))}
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} size="sm" className="w-full rounded-xl">
            Save Progress
          </Button>
        </div>

        {/* Date Picker for Finished Status */}
        {showDatePicker && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  When did you finish reading?
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="date"
                  value={finishedDate}
                  onChange={(e) => setFinishedDate(e.target.value)}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border border-border",
                    "bg-background text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "transition-all"
                  )}
                  max={new Date().toISOString().split("T")[0]}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleDateConfirm}
                    size="sm"
                    className="flex-1 rounded-xl"
                  >
                    Confirm
                  </Button>
                  <Button
                    onClick={handleDateCancel}
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Actions */}
        {!showDatePicker && (
          <div className="p-4 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Or change status
            </p>
            <div className="grid grid-cols-4 gap-2">
              {statusActions.map(({ status, label, icon: Icon, color }) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                    "hover:scale-105 active:scale-95",
                    color
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-medium text-center">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
