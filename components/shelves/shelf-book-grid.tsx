"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRef } from "react";

import { ReadingStatus } from "@/types";

import { BookCard } from "../ui/book/book-card";
import { BookStatus, BookStatusDates } from "../ui/book/book-progress-editor";

// Helper function to extract DNF reason from notes
function extractDNFReason(notes: string | null | undefined): string | null {
  if (!notes || !notes.trim()) return null;

  const note = notes.toLowerCase().trim();

  // Categorize common reasons
  if (
    note.includes("boring") ||
    note.includes("dull") ||
    note.includes("slow")
  ) {
    return "Too Slow";
  } else if (
    note.includes("confusing") ||
    note.includes("complex") ||
    note.includes("hard to follow")
  ) {
    return "Too Complex";
  } else if (
    note.includes("not interested") ||
    note.includes("lost interest") ||
    note.includes("not my thing")
  ) {
    return "Lost Interest";
  } else if (
    note.includes("writing") ||
    note.includes("prose") ||
    note.includes("style")
  ) {
    return "Writing Style";
  } else if (note.includes("character") || note.includes("characters")) {
    return "Characters";
  } else if (note.includes("plot") || note.includes("story")) {
    return "Plot Issues";
  } else if (note.length < 50) {
    // Short notes - use as-is (capitalize first letter)
    return note.charAt(0).toUpperCase() + note.slice(1);
  }

  return "Other";
}

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
  notes?: string | null;
  // Paused shelf specific
  days_since_last_read?: number | null;
  latest_journal_entry?: string | null;
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
  onStatusChange?: (
    bookId: string,
    status: BookStatus,
    dates?: BookStatusDates
  ) => void;
  onRemove?: (bookId: string, currentStatus: ReadingStatus) => void;
  onMoveToUpNext?: (bookId: string) => void;
  onRedemption?: (bookId: string) => void;
  isDNFShelf?: boolean;
  isPausedShelf?: boolean;
}

export function ShelfBookGrid({
  books,
  sortBy = "progress",
  onProgressUpdate,
  onStatusChange,
  onRemove,
  onMoveToUpNext,
  onRedemption,
  isDNFShelf = false,
  isPausedShelf = false,
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
    <>
      {/* Mobile: Grid Layout */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

            const dnfReason = isDNFShelf ? extractDNFReason(book.notes) : null;

            return (
              <div key={book.id} className="flex flex-col">
                <BookCard
                  className="flex-1"
                  title={book.title}
                  author={book.author}
                  cover={book.cover}
                  pagesRead={book.pagesRead}
                  totalPages={book.totalPages}
                  editable
                  isNeglected={isNeglected(book)}
                  isDNF={isDNFShelf}
                  dnfReason={dnfReason}
                  isPaused={isPausedShelf}
                  daysSinceLastRead={book.days_since_last_read}
                  latestJournalEntry={book.latest_journal_entry}
                  onProgressUpdate={(pages) =>
                    onProgressUpdate?.(book.id, pages)
                  }
                  onStatusChange={(status, dates) =>
                    onStatusChange?.(book.id, status, dates)
                  }
                  onRemove={() => onRemove?.(book.id, book.status!)}
                  onRedemption={
                    onRedemption ? () => onRedemption(book.id) : undefined
                  }
                  currentStatus={book.status}
                />
                {/* DNF Reason Display */}
                {isDNFShelf && dnfReason && (
                  <div className="mt-2 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800/50">
                    {dnfReason}
                  </div>
                )}
                {isFinished && formattedDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 mt-2">
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
      </div>

      {/* Desktop: Horizontal Scroll Layout */}
      <div className="hidden lg:block relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide items-stretch"
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

            const dnfReason = isDNFShelf ? extractDNFReason(book.notes) : null;

            return (
              <div
                key={book.id}
                data-book-card
                className="flex flex-col min-w-[22%]"
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
                  isDNF={isDNFShelf}
                  dnfReason={dnfReason}
                  isPaused={isPausedShelf}
                  daysSinceLastRead={book.days_since_last_read}
                  latestJournalEntry={book.latest_journal_entry}
                  onProgressUpdate={(pages) =>
                    onProgressUpdate?.(book.id, pages)
                  }
                  onStatusChange={(status, dates) =>
                    onStatusChange?.(book.id, status, dates)
                  }
                  onRemove={() => onRemove?.(book.id, book.status!)}
                  onRedemption={
                    onRedemption ? () => onRedemption(book.id) : undefined
                  }
                  currentStatus={book.status}
                />
                {/* DNF Reason Display */}
                {isDNFShelf && dnfReason && (
                  <div className="mt-2 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30 text-center rounded-lg border border-red-200 dark:border-red-800/50 w-2/3">
                    {dnfReason}
                  </div>
                )}
                {isFinished && formattedDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 mt-2">
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

        {books.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </>
  );
}
