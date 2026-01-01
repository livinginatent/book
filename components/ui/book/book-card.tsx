"use client";

import { BookOpen, Star, X } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types/database.types";

import {
  BookProgressEditor,
  BookStatus,
  BookStatusDates,
} from "./book-progress-editor";
import { BookReviewForm } from "./book-review-form";

interface BookCardProps {
  title: string;
  author: string;
  cover: string;
  bookId?: string;
  rating?: number;
  reviewAttributes?: {
    moods?: string[];
    pacing?: string | null;
    diverse_cast?: boolean;
    character_development?: boolean;
    plot_driven?: boolean;
  };
  progress?: number;
  pagesRead?: number;
  totalPages?: number;
  className?: string;
  onProgressUpdate?: (pages: number) => void;
  onStatusChange?: (status: BookStatus, dates?: BookStatusDates) => void;
  onRemove?: () => void;
  onRatingUpdate?: (rating: number) => void;
  editable?: boolean;
  isNeglected?: boolean;
  currentStatus?: ReadingStatus;
  isDNF?: boolean;
  dnfReason?: string | null;
  onRedemption?: () => void;
  // Paused shelf specific props
  isPaused?: boolean;
  daysSinceLastRead?: number | null;
  latestJournalEntry?: string | null;
  dateStarted?: string | null;
}

export function BookCard({
  title,
  author,
  cover,
  bookId,
  rating,
  reviewAttributes,
  progress,
  pagesRead = 0,
  totalPages = 100,
  className,
  onProgressUpdate,
  onStatusChange,
  onRemove,
  onRatingUpdate,
  editable = false,
  isNeglected = false,
  currentStatus,
  isDNF = false,
  dnfReason,
  onRedemption,
  isPaused = false,
  daysSinceLastRead,
  latestJournalEntry,
  dateStarted,
}: BookCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | undefined>(
    rating
  );

  // Sync rating prop with state
  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const displayProgress =
    progress ??
    (totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0);

  const handleCardClick = () => {
    if (editable) {
      setIsEditing(true);
    }
  };

  const handleProgressSave = (pages: number) => {
    onProgressUpdate?.(pages);
  };

  const handleStatusChange = (status: BookStatus, dates?: BookStatusDates) => {
    onStatusChange?.(status, dates);
  };

  const handleRatingClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (bookId) {
      setIsReviewDialogOpen(true);
    }
  };

  const handleReviewSuccess = (newRating: number) => {
    setCurrentRating(newRating);
    onRatingUpdate?.(newRating);
    setIsReviewDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col",
        "transition-transform duration-300 hover:-translate-y-2",
        editable && "cursor-pointer",
        isNeglected && "",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Book Cover Container */}
      <div className="relative w-full h-auto aspect-[2/3] md:w-48 md:h-72 rounded-xl overflow-hidden shadow-lg shadow-foreground/10 mb-3">
        {/* Fixed dimensions: 192px × 288px (maintains 2:3 aspect ratio) */}
        <Image
          src={cover || "/placeholder.svg"}
          alt={`Cover for ${title} by ${author}`}
          fill
          sizes="192px"
          className={cn(
            "object-cover transition-all duration-500 group-hover:scale-105",
            isDNF && "grayscale group-hover:grayscale-0"
          )}
          priority={false}
        />

        {/* DNF Reason Badge */}
        {isDNF && dnfReason && (
          <div className="absolute top-2 left-2 right-2 z-20 ">
            <span className="bg-red-600/90 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg border border-red-800/50">
              {dnfReason}
            </span>
          </div>
        )}

        {/* Paused shelf: Last read badge */}
        {isPaused &&
          daysSinceLastRead !== null &&
          daysSinceLastRead !== undefined && (
            <div className="absolute top-2 right-2 z-20">
              <span className="bg-muted/90 text-muted-foreground text-xs font-medium px-2 py-1 rounded-md shadow-md border border-border/50">
                Last read {daysSinceLastRead} day
                {daysSinceLastRead !== 1 ? "s" : ""} ago
              </span>
            </div>
          )}

        {isNeglected && !isDNF && !isPaused && (
          <div className="absolute top-2 right-2 z-20">
            <span className="bg-amber-500/90 text-amber-950 text-xs font-medium px-2 py-1 rounded-md shadow-md">
              Paused?
            </span>
          </div>
        )}

        {displayProgress !== undefined && displayProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-3 z-10">
            {isDNF ? (
              <>
                <div className="flex items-center gap-2 text-background text-sm font-medium">
                  <BookOpen className="w-4 h-4" />
                  <span>Stopped at {displayProgress}%</span>
                </div>
                <div className="mt-1 h-1.5 bg-background/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-background text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    {pagesRead} / {totalPages} pages
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-background/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${displayProgress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {editable && !isEditing && (
          <div className="absolute inset-0 bg-foreground/10 md:bg-foreground/0 md:group-hover:bg-foreground/10 transition-colors flex items-center justify-center z-10">
            <span className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-xs font-medium text-background bg-foreground/70 px-2 py-1 rounded-lg">
              Tap to edit
            </span>
          </div>
        )}

        {editable && (
          <BookProgressEditor
            currentPages={pagesRead}
            totalPages={totalPages}
            isOpen={isEditing}
            onClose={() => setIsEditing(false)}
            onSave={handleProgressSave}
            onStatusChange={handleStatusChange}
            onRemove={onRemove}
            currentStatus={currentStatus}
            bookId={bookId}
            dateStarted={dateStarted}
          />
        )}
      </div>

      {/* Book Info */}
      <h4 className="text-xs md:text-base font-semibold text-foreground line-clamp-2 leading-tight mb-1">
        {" "}
        {title}
      </h4>
      <p className="text-[10px] md:text-sm text-muted-foreground mb-1">
        {author}
      </p>

      {/* Rating */}
      <div
        className={cn(
          "mt-1 min-h-[18px] flex items-center gap-1",
          bookId && "cursor-pointer hover:opacity-80 transition-opacity"
        )}
        onClick={bookId ? handleRatingClick : undefined}
        role={bookId ? "button" : undefined}
        tabIndex={bookId ? 0 : undefined}
        onKeyDown={
          bookId
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRatingClick(e as unknown as React.MouseEvent);
                }
              }
            : undefined
        }
      >
        {currentRating
          ? [...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3.5 h-3.5",
                  i < Math.floor(currentRating)
                    ? "fill-primary text-primary"
                    : "text-border"
                )}
              />
            ))
          : bookId && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="w-3.5 h-3.5" />
                <span className="text-xs">Rate this book</span>
              </div>
            )}
        {currentRating && (
          <span className="text-xs text-muted-foreground ml-1">
            {currentRating}
          </span>
        )}
      </div>

      {/* Redemption Button for DNF books */}
      {isDNF && onRedemption && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRedemption();
          }}
          className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary hover:bg-primary/90 text-white  transition-colors w-2/3"
        >
          Give it another shot
        </button>
      )}

      {/* Paused shelf: Journal Preview */}
      {isPaused && latestJournalEntry && (
        <div className="mt-2 p-2 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs font-medium text-foreground mb-1">Last Note</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {latestJournalEntry.length > 60
              ? `${latestJournalEntry.substring(0, 60)}...`
              : latestJournalEntry}
          </p>
        </div>
      )}

      {/* Review Dialog */}
      {bookId && isReviewDialogOpen && typeof window !== "undefined" && (
        <>
          {createPortal(
            <div
              className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setIsReviewDialogOpen(false);
                }
              }}
            >
              <div
                className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200 overflow-hidden max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Star className="w-4 h-4 text-primary" />
                    <span>Review {title}</span>
                  </div>
                  <button
                    onClick={() => setIsReviewDialogOpen(false)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Review Form */}
                <div className="p-4">
                  <BookReviewForm
                    bookId={bookId}
                    initialRating={currentRating ?? null}
                    initialAttributes={reviewAttributes}
                    onSuccess={handleReviewSuccess}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
