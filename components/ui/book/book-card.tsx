"use client";

import { useState } from "react";
import { Star, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

import { BookProgressEditor, BookStatus } from "./book-progress-editor";

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
  onStatusChange?: (status: BookStatus) => void;
  editable?: boolean;
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
  editable = false,
}: BookCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Calculate progress from pages if not provided directly
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

  const handleStatusChange = (status: BookStatus) => {
    onStatusChange?.(status);
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col",
        "transition-transform duration-300 hover:-translate-y-2",
        editable && "cursor-pointer",
        className
      )}
      onClick={handleCardClick}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg shadow-foreground/10 mb-3">
        <img
          src={cover || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {displayProgress !== undefined && displayProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-3">
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
          </div>
        )}

        {editable && !isEditing && (
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
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
          />
        )}
      </div>

      {/* Book Info */}
      <h4 className="font-semibold text-foreground line-clamp-2 leading-tight mb-1">
        {title}
      </h4>
      <p className="text-sm text-muted-foreground mb-1">{author}</p>

      {/* Rating */}
      {rating && (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
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
          <span className="text-xs text-muted-foreground ml-1">{rating}</span>
        </div>
      )}
    </div>
  );
}


