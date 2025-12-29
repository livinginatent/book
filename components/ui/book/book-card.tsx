"use client";

import { BookOpen, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types/database.types";

import {
  BookProgressEditor,
  BookStatus,
  BookStatusDates,
} from "./book-progress-editor";

interface BookCardProps {
  title: string;
  author: string;
  cover: string;
  rating?: number;
  progress?: number;
  pagesRead?: number;
  totalPages?: number;
  className?: string;
  onProgressUpdate?: (pages: number) => void;
  onStatusChange?: (status: BookStatus, dates?: BookStatusDates) => void;
  onRemove?: () => void;
  editable?: boolean;
  isNeglected?: boolean;
  currentStatus?: ReadingStatus;
  isDNF?: boolean;
  dnfReason?: string | null;
  onRedemption?: () => void;
}

export function BookCard({
  title,
  author,
  cover,
  rating,
  progress,
  pagesRead = 0,
  totalPages = 100,
  className,
  onProgressUpdate,
  onStatusChange,
  onRemove,
  editable = false,
  isNeglected = false,
  currentStatus,
  isDNF = false,
  dnfReason,
  onRedemption,
}: BookCardProps) {
  const [isEditing, setIsEditing] = useState(false);

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
      <div className="relative w-48 h-72 rounded-xl overflow-hidden shadow-lg shadow-foreground/10 mb-3">
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

        {isNeglected && !isDNF && (
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
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center z-10">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-background bg-foreground/70 px-2 py-1 rounded-lg">
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
          />
        )}
      </div>

      {/* Book Info */}
      <h4 className="font-semibold text-foreground line-clamp-2 leading-tight mb-1">
        {" "}
        {title}
      </h4>
      <p className="text-sm text-muted-foreground mb-1">{author}</p>

      {/* Rating */}
      <div className="mt-1 min-h-[18px] flex items-center gap-1">
        {rating &&
          [...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-3.5 h-3.5",
                i < Math.floor(rating)
                  ? "fill-primary text-primary"
                  : "text-border"
              )}
            />
          ))}
        {rating && (
          <span className="text-xs text-muted-foreground ml-1">{rating}</span>
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
    </div>
  );
}
