/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { BookMarked, BookOpen, BookX, Calendar, FileText, ListPlus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { BookAction, BookActionMenu } from "@/components/ui/book/book-actions";
import { GenreTag } from "@/components/ui/book/genre-tag";
import { cn } from "@/lib/utils";
import type { Book } from "@/types/database.types";

const mobileActions = [
  {
    id: "to-read" as BookAction,
    icon: BookMarked,
    label: "Want to Read",
    color: "bg-primary text-primary-foreground",
  },
  {
    id: "currently-reading" as BookAction,
    icon: BookOpen,
    label: "Reading",
    color: "bg-accent text-accent-foreground",
  },
  {
    id: "up-next" as BookAction,
    icon: ListPlus,
    label: "Up Next",
    color: "bg-chart-4 text-foreground",
  },
  {
    id: "did-not-finish" as BookAction,
    icon: BookX,
    label: "DNF",
    color: "bg-muted text-muted-foreground",
  },
];

interface BookSearchResultCardProps {
  book: Book;
  onAction?: (action: BookAction, book: Book) => void;
}

export function BookSearchResultCard({
  book,
  onAction,
}: BookSearchResultCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const coverUrl =
    book.cover_url_large || book.cover_url_medium || book.cover_url_small;
  const authors = book.authors?.join(", ") || "Unknown Author";
  const showPlaceholder = !coverUrl || imageError;

  // Get first 3 genres/subjects
  const genres = book.subjects?.slice(0, 3) || [];

  const handleAction = async (action: BookAction) => {
    onAction?.(action, book);
  };

  return (
    <div
      className="group relative bg-card rounded-2xl border border-border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Inner content with overflow-hidden for rounded corners */}
      <div className="overflow-hidden rounded-2xl">
        <div className="flex gap-4 p-4 relative">
          {/* Book Cover - Fixed width for consistency */}
          <div className="relative flex-shrink-0 w-28 md:w-32">
            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md bg-muted">
              {showPlaceholder ? (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
              ) : (
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <Image
                    src={coverUrl || "/placeholder.svg"}
                    alt={book.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 112px, 128px"
                    unoptimized={coverUrl?.includes("openlibrary.org")}
                  />
                </div>
              )}
            </div>
          </div>

        {/* Book Details */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title & Author */}
          <h4 className="font-bold text-foreground line-clamp-2 leading-tight mb-1 text-base md:text-lg">
            {book.title}
          </h4>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
            {authors}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
            {book.publish_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{book.publish_date}</span>
              </div>
            )}
            {book.page_count && (
              <div className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>{book.page_count} pages</span>
              </div>
            )}
          </div>

          {/* Genre Tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto">
              {genres.map((genre, index) => (
                <GenreTag key={index} genre={genre} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Horizontal Action Buttons - Always visible */}
      <div className="sm:hidden px-4 pb-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between gap-2">
          {mobileActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200",
                  action.color,
                  "active:scale-95"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-medium leading-tight text-center">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: Radial Action Menu - Positioned outside overflow boundary */}
      <div
        className={cn(
          "hidden sm:block absolute bottom-2 right-2 z-[100] transition-all duration-300",
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}
        style={{ pointerEvents: isHovered ? "auto" : "none" }}
      >
        <BookActionMenu onAction={handleAction} />
      </div>
    </div>
    </div>
  );
}
