"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRef } from "react";

import { BookCard } from "../ui/book/book-card";
import { BookStatus } from "../ui/book/book-progress-editor";
import { ReadingStatus } from "@/types";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
  lastReadDate?: Date | null;
  date_added?: string;
  dateFinished?: string | null;
  status?: ReadingStatus;
}

interface ShelfBookGridProps {
  books: Book[];
  sortBy?:
    | "progress"
    | "added"
    | "title"
    | "neglected"
    | "oldest"
    | "newest"
    | "shortest";
  onProgressUpdate?: (bookId: string, pages: number) => void;
  onStatusChange?: (bookId: string, status: BookStatus) => void;
  onRemove?: (bookId: string, currentStatus: ReadingStatus) => void;
  onMoveToUpNext?: (bookId: string) => void;
}

export function ShelfBookGrid({
  books,
  sortBy = "progress",
  onProgressUpdate,
  onStatusChange,
  onRemove,
  onMoveToUpNext,
}: ShelfBookGridProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Helper function to check if a book is neglected (> 3 days since last read, but only if added > 1 week ago)
  const isNeglected = (book: Book): boolean => {
    // Finished books cannot be neglected
    if (book.status === "finished") {
      return false;
    }

    // If book has a date_added, check if it's been at least a week
    if (book.date_added) {
      try {
        const dateAdded = new Date(book.date_added);
        if (!isNaN(dateAdded.getTime())) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          // If book was added less than a week ago, it's not neglected
          if (dateAdded > oneWeekAgo) {
            return false;
          }
        }
      } catch {
        // If we can't parse date_added, continue with normal logic
      }
    }

    // If never read, check if it's been a week since added
    if (!book.lastReadDate) {
      // If no date_added, consider it neglected (old behavior)
      if (!book.date_added) return true;
      // If date_added exists and is more than a week ago, it's neglected
      try {
        const dateAdded = new Date(book.date_added);
        if (!isNaN(dateAdded.getTime())) {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return dateAdded < oneWeekAgo;
        }
      } catch {
        return true; // Error parsing date
      }
      return true;
    }

    // If book has been read, check if it's been > 3 days since last read
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const lastRead = new Date(book.lastReadDate);
      if (isNaN(lastRead.getTime())) return true; // Invalid date
      return lastRead < threeDaysAgo;
    } catch {
      return true; // Error parsing date
    }
  };

  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === "progress") {
      const progressA = a.totalPages > 0 ? a.pagesRead / a.totalPages : 0;
      const progressB = b.totalPages > 0 ? b.pagesRead / b.totalPages : 0;
      return progressB - progressA; // Descending
    } else if (sortBy === "neglected") {
      // Sort by lastReadDate ascending (oldest first)
      const dateA = a.lastReadDate ? new Date(a.lastReadDate).getTime() : 0;
      const dateB = b.lastReadDate ? new Date(b.lastReadDate).getTime() : 0;
      return dateA - dateB; // Ascending (oldest first)
    } else if (sortBy === "added") {
      // Sort by date_added descending (newest first)
      const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
      const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
      return dateB - dateA; // Descending (newest first)
    } else if (sortBy === "oldest") {
      // Sort by date_added ascending (oldest first)
      const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
      const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
      return dateA - dateB; // Ascending (oldest first)
    } else if (sortBy === "newest") {
      // Sort by date_added descending (newest first)
      const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
      const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
      return dateB - dateA; // Descending (newest first)
    } else if (sortBy === "shortest") {
      // Sort by totalPages ascending (shortest first)
      return (a.totalPages || 0) - (b.totalPages || 0);
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const scrollByCards = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const firstChild =
      container.querySelector<HTMLDivElement>("[data-book-card]");
    const cardWidth = firstChild?.clientWidth ?? 0;
    const gap = 16;
    const amount = (cardWidth + gap) * 2;

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (books.length === 0) {
    return (
      <div className="col-span-full py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">📚</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No books here yet
        </h3>
        <p className="text-muted-foreground">
          Start reading to build your shelf!
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Mobile: Horizontal scroll, Desktop: Grid */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide items-stretch sm:grid sm:grid-cols-2 sm:overflow-x-visible sm:pb-0 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
      >
        {sortedBooks.map((book) => {
          const isFinished = book.status === "finished";
          const finishedDate = book.dateFinished
            ? new Date(book.dateFinished)
            : null;
          const formattedDate = finishedDate
            ? finishedDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;

          return (
            <div
              key={book.id}
              data-book-card
              className="flex flex-col min-w-[70%] sm:min-w-0"
            >
              <BookCard
                className="flex-1"
                title={book.title}
                author={book.author}
                cover={book.cover}
                pagesRead={book.pagesRead}
                totalPages={book.totalPages}
                editable
                isNeglected={isNeglected(book)}
                onProgressUpdate={(pages) => onProgressUpdate?.(book.id, pages)}
                onStatusChange={(status) => onStatusChange?.(book.id, status)}
                onRemove={() => onRemove?.(book.id, book.status!)}
                currentStatus={book.status}
              />
              {isFinished && formattedDate && (
                <div className=" flex items-center gap-1.5 text-xs text-muted-foreground px-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Finished {formattedDate}</span>
                </div>
              )}
              {onMoveToUpNext && (
                <button
                  onClick={() => onMoveToUpNext(book.id)}
                  className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors w-full"
                >
                  Move to Up Next
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll buttons - only show on mobile when there are more than 2 books */}
      {books.length > 2 && (
        <>
          <button
            type="button"
            onClick={() => scrollByCards("left")}
            className="sm:hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards("right")}
            className="sm:hidden absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
