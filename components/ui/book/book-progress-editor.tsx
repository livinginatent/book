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
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { hasReadingSessions } from "@/app/actions/book-actions";
import { DNFReasonInput } from "@/components/ui/book/dnf-reason-input";
import { ReadingDatePicker } from "@/components/ui/book/reading-date-picker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types/database.types";

// BookStatus is just ReadingStatus - remove is handled separately
export type BookStatus = ReadingStatus;

export interface BookStatusDates {
  dateStarted?: string;
  dateFinished?: string;
  notes?: string | null;
  createSession?: boolean;
}

interface BookProgressEditorProps {
  currentPages: number;
  totalPages: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pages: number) => void;
  onStatusChange: (status: BookStatus, dates?: BookStatusDates) => void;
  onRemove?: () => void;
  currentStatus?: ReadingStatus;
  className?: string;
  dateStarted?: string | null;
  bookId?: string;
}

// All possible status actions with their display info
const allStatusActions = [
  {
    status: "finished" as BookStatus,
    label: "Finished",
    icon: Check,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
  {
    status: "currently_reading" as BookStatus,
    label: "Currently reading",
    icon: BookOpen,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
  {
    status: "paused" as BookStatus,
    label: "Paused",
    icon: Pause,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
  {
    status: "dnf" as BookStatus,
    label: "DNF",
    icon: XCircle,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
  {
    status: "want_to_read" as BookStatus,
    label: "Want to Read",
    icon: BookOpen,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
  {
    status: "up_next" as BookStatus,
    label: "Up Next",
    icon: BookOpen,
    color:
      "bg-muted/50 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30",
  },
];

// Get available status actions based on current status
function getAvailableStatusActions(
  currentStatus?: ReadingStatus
): typeof allStatusActions {
  if (!currentStatus) {
    // If no current status, show all status actions
    return allStatusActions;
  }

  // Define valid transitions from each status
  const validTransitions: Record<ReadingStatus, BookStatus[]> = {
    want_to_read: ["currently_reading", "up_next", "dnf"],
    currently_reading: ["finished", "paused", "dnf", "up_next"],
    finished: [], // Finished books have no status transitions
    paused: ["currently_reading", "finished", "dnf"],
    dnf: ["currently_reading", "want_to_read"], // Can resume a DNF book
    up_next: ["currently_reading", "want_to_read"],
  };

  const allowedStatuses = validTransitions[currentStatus] || [];
  return allStatusActions.filter((action) =>
    allowedStatuses.includes(action.status)
  );
}

export function BookProgressEditor({
  currentPages,
  totalPages,
  isOpen,
  onClose,
  onSave,
  onStatusChange,
  onRemove,
  currentStatus,
  className,
  dateStarted,
  bookId,
}: BookProgressEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [pages, setPages] = useState(currentPages);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDNFReason, setShowDNFReason] = useState(false);
  const [showFinishPrompt, setShowFinishPrompt] = useState(false);
  const [showNoSessionsModal, setShowNoSessionsModal] = useState(false);
  const [shouldCreateSession, setShouldCreateSession] = useState(true);
  const [checkingSessions, setCheckingSessions] = useState(false);
  const [showedNoSessionsModal, setShowedNoSessionsModal] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState(today);
  const progress = totalPages > 0 ? Math.round((pages / totalPages) * 100) : 0;

  // Helper function to convert ISO date string to YYYY-MM-DD format
  const formatDateForInput = (isoDate: string | null | undefined): string => {
    if (!isoDate) return "";
    try {
      const date = new Date(isoDate);
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowDatePicker(false);
      setShowDNFReason(false);
      setShowFinishPrompt(false);
      setShowNoSessionsModal(false);
      setShowedNoSessionsModal(false);
      setShouldCreateSession(true);
      setStartDate("");
      setFinishDate(new Date().toISOString().split("T")[0]);
    } else if (isOpen && dateStarted) {
      // Initialize start date from dateStarted when modal opens
      setStartDate(formatDateForInput(dateStarted));
    }
  }, [isOpen, dateStarted]);

  const handleIncrement = (amount: number) => {
    setPages((prev) => {
      const newPages = Math.min(totalPages, Math.max(0, prev + amount));
      // Check if we've reached total pages and book is not already finished
      if (
        newPages === totalPages &&
        totalPages > 0 &&
        currentStatus !== "finished" &&
        prev < totalPages
      ) {
        setShowFinishPrompt(true);
      }
      return newPages;
    });
  };

  const handleSave = () => {
    onSave(pages);
    onClose();
  };

  const handleStatusChange = async (status: BookStatus) => {
    if (status === "finished") {
      // Check if book has reading sessions before showing date picker
      if (bookId) {
        setCheckingSessions(true);
        const result = await hasReadingSessions(bookId);
        setCheckingSessions(false);

        if (result.success && !result.hasSessions && result.pageCount > 0) {
          // No sessions found, show modal asking if they want to log pages
          setShowedNoSessionsModal(true);
          setShowNoSessionsModal(true);
        } else {
          // Has sessions or no page count, proceed normally
          setShowedNoSessionsModal(false);
          setShowDatePicker(true);
        }
      } else {
        // No bookId provided, proceed normally
        setShowDatePicker(true);
      }
    } else if (status === "dnf") {
      setShowDNFReason(true);
    } else {
      onStatusChange(status);
      onClose();
    }
  };

  const handleRemove = () => {
    onRemove?.();
    onClose();
  };

  // Get available actions based on current status
  const availableActions = getAvailableStatusActions(currentStatus);
  const isFinished = currentStatus === "finished";

  const handleDateConfirm = () => {
    const dates: BookStatusDates = {};

    // Convert finish date string to ISO string (end of day in user's timezone)
    const finishDateObj = new Date(finishDate);
    finishDateObj.setHours(23, 59, 59, 999);
    dates.dateFinished = finishDateObj.toISOString();

    // Convert start date if provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      dates.dateStarted = startDateObj.toISOString();
    }

    // Include createSession flag if we showed the no-sessions modal
    if (showedNoSessionsModal) {
      dates.createSession = shouldCreateSession;
    }

    onStatusChange("finished", dates);
    onClose();
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setStartDate("");
    setFinishDate(today);
  };

  const handleDNFConfirm = (reason: string | null) => {
    const dates: BookStatusDates = {
      notes: reason,
    };
    onStatusChange("dnf", dates);
    onClose();
  };

  const handleDNFCancel = () => {
    setShowDNFReason(false);
  };

  const handleFinishPromptConfirm = () => {
    setShowFinishPrompt(false);
    setShowDatePicker(true);
  };

  const handleFinishPromptCancel = () => {
    setShowFinishPrompt(false);
  };

  const handleNoSessionsConfirm = () => {
    setShowNoSessionsModal(false);
    setShouldCreateSession(true);
    setShowDatePicker(true);
  };

  const handleNoSessionsCancel = () => {
    setShowNoSessionsModal(false);
    setShouldCreateSession(false);
    setShowDatePicker(true);
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
        "fixed inset-0 z-50 flex items-center justify-center",
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

          {/* Page Counter - Hide for finished books */}
          {!isFinished && (
            <>
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
              <Button
                onClick={handleSave}
                size="sm"
                className="w-full rounded-xl"
              >
                Save Progress
              </Button>
            </>
          )}
        </div>

        {/* Finish Prompt */}
        {showFinishPrompt && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  You&apos;ve reached the end!
                </p>
                <p className="text-xs text-muted-foreground">
                  Would you like to mark this book as finished?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleFinishPromptCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  Not yet
                </Button>
                <Button
                  onClick={handleFinishPromptConfirm}
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  Mark as Finished
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* No Sessions Modal */}
        {showNoSessionsModal && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <BookOpen className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground mb-1">
                  You haven&apos;t logged any sessions for this book.
                </p>
                <p className="text-xs text-muted-foreground">
                  Should we log the full {totalPages} pages for this book?
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleNoSessionsCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  No
                </Button>
                <Button
                  onClick={handleNoSessionsConfirm}
                  size="sm"
                  className="flex-1 rounded-xl"
                >
                  Yes, log {totalPages} pages
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Date Picker for Finished Status */}
        {showDatePicker && !showNoSessionsModal && (
          <div className="p-4 border-t border-border bg-muted/30">
            <ReadingDatePicker
              startDate={startDate}
              finishDate={finishDate}
              onStartDateChange={setStartDate}
              onFinishDateChange={setFinishDate}
              onConfirm={handleDateConfirm}
              onCancel={handleDateCancel}
              showStartDate={true}
              title="When did you read this book?"
            />
          </div>
        )}

        {/* DNF Reason Input */}
        {showDNFReason && (
          <DNFReasonInput
            onConfirm={handleDNFConfirm}
            onCancel={handleDNFCancel}
          />
        )}

        {/* Loading state while checking sessions */}
        {checkingSessions && (
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking reading sessions...</span>
            </div>
          </div>
        )}

        {/* Status Actions */}
        {!showDatePicker &&
          !showDNFReason &&
          !showFinishPrompt &&
          !showNoSessionsModal &&
          !checkingSessions && (
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Or change status
              </p>
              <div
                className={cn(
                  "grid gap-2",
                  availableActions.length === 0
                    ? "grid-cols-1"
                    : availableActions.length === 1
                      ? "grid-cols-1"
                      : availableActions.length === 2
                        ? "grid-cols-2"
                        : availableActions.length === 3
                          ? "grid-cols-3"
                          : "grid-cols-4"
                )}
              >
                {availableActions.map(
                  ({ status, label, icon: Icon, color }) => (
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
                  )
                )}
                {onRemove && (
                  <button
                    onClick={handleRemove}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                      "hover:scale-105 active:scale-95",
                      "bg-muted/50 text-muted-foreground border border-border hover:bg-muted hover:text-destructive hover:border-destructive/30"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-[10px] font-medium text-center">
                      Remove
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
    </div>,
    document.body
  );
}
