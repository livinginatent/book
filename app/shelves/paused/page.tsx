"use client";

import { BookOpen, Loader2, Pause, AlertCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateBookStatus } from "@/app/actions/book-actions";
import { getPausedBooks } from "@/app/actions/paused-shelf";
import { updateBookReview } from "@/app/actions/reviews";
import { ShelfBookGrid } from "@/components/shelves/shelf-book-grid";
import { ShelfHeader } from "@/components/shelves/shelf-header";
import { ShelfStats } from "@/components/shelves/shelf-stats";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { DashboardCard } from "@/components/ui/dashboard-card";
import type { ReadingStatus } from "@/types/database.types";

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
  rating?: number | null;
  reviewAttributes?: {
    moods?: string[];
    pacing?: string | null;
    difficulty?: string | null;
    diverse_cast?: boolean;
    character_development?: boolean;
    plot_driven?: boolean;
    strong_prose?: boolean;
    world_building?: boolean;
    twist_ending?: boolean;
    multiple_pov?: boolean;
  };
  days_since_last_read: number | null;
  latest_journal_entry: string | null;
  status?: ReadingStatus;
}

// Shelf navigation configuration
const SHELVES = [
  { status: "currently-reading", label: "Currently Reading", icon: BookOpen },
  { status: "want-to-read", label: "Want to Read", icon: BookOpen },
  { status: "finished", label: "Finished", icon: BookOpen },
  { status: "paused", label: "Paused", icon: Pause },
  { status: "did-not-finish", label: "Did Not Finish", icon: BookOpen },
  { status: "up-next", label: "Up Next", icon: BookOpen },
] as const;

export default function PausedShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [sortBy, setSortBy] = useState<
    | "progress"
    | "added"
    | "title"
    | "neglected"
    | "oldest"
    | "newest"
    | "shortest"
  >("neglected");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Fetch paused books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getPausedBooks();

      if (!isMounted) return;

      if (result.success) {
        const transformed: ShelfBook[] = result.books.map((book) => {
          const reviewAttrs = book.userBook.review_attributes as
            | {
                moods?: string[];
                pacing?: string | null;
                difficulty?: string | null;
                diverse_cast?: boolean;
                character_development?: boolean;
                plot_driven?: boolean;
                strong_prose?: boolean;
                world_building?: boolean;
                twist_ending?: boolean;
                multiple_pov?: boolean;
              }
            | null;
          return {
            id: book.id,
            title: book.title,
            author: book.authors?.join(", ") || "Unknown Author",
            cover:
              book.cover_url_medium ||
              book.cover_url_large ||
              book.cover_url_small ||
              "",
            pagesRead: book.pages_read,
            totalPages: book.page_count || 0,
            rating: book.userBook.rating,
            reviewAttributes: reviewAttrs || {},
            days_since_last_read: book.days_since_last_read,
            latest_journal_entry: book.latest_journal_entry,
            status: book.userBook.status,
          };
        });

        setBooks(transformed);
      } else {
        console.error("Failed to load paused books shelf:", result.error);
        setBooks([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    fetchBooks();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle status change
  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const fetchResult = await getPausedBooks();
        if (fetchResult.success) {
          const transformed: ShelfBook[] = fetchResult.books.map((book) => ({
            id: book.id,
            title: book.title,
            author: book.authors?.join(", ") || "Unknown Author",
            cover:
              book.cover_url_medium ||
              book.cover_url_large ||
              book.cover_url_small ||
              "",
            pagesRead: book.pages_read,
            totalPages: book.page_count || 0,
            days_since_last_read: book.days_since_last_read,
            latest_journal_entry: book.latest_journal_entry,
            status: book.userBook.status,
          }));
          setBooks(transformed);
        }
        return;
      }

      // Remove from UI when status changes away from paused
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    },
    []
  );

  // Handle rating update
  const handleRatingUpdate = useCallback(
    async (bookId: string, rating: number) => {
      // Optimistically update UI
      setBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, rating } : book
        )
      );

      // Update in database (attributes are preserved from existing review_attributes)
      const book = books.find((b) => b.id === bookId);
      const existingAttributes = book?.reviewAttributes || {};
      const result = await updateBookReview(bookId, rating, existingAttributes);

      if (!result.success) {
        console.error("Failed to update rating:", result.error);
        // Revert by refetching
        const fetchResult = await getPausedBooks();
        if (fetchResult.success) {
          const transformed: ShelfBook[] = fetchResult.books.map((book) => {
            const reviewAttrs = book.userBook.review_attributes as
              | {
                  moods?: string[];
                  pacing?: string | null;
                  difficulty?: string | null;
                  diverse_cast?: boolean;
                  character_development?: boolean;
                  plot_driven?: boolean;
                  strong_prose?: boolean;
                  world_building?: boolean;
                  twist_ending?: boolean;
                  multiple_pov?: boolean;
                }
              | null;
            return {
              id: book.id,
              title: book.title,
              author: book.authors?.join(", ") || "Unknown Author",
              cover:
                book.cover_url_medium ||
                book.cover_url_large ||
                book.cover_url_small ||
                "",
              pagesRead: book.pages_read,
              totalPages: book.page_count || 0,
              rating: book.userBook.rating,
              reviewAttributes: reviewAttrs || {},
              days_since_last_read: book.days_since_last_read,
              latest_journal_entry: book.latest_journal_entry,
              status: book.userBook.status,
            };
          });
          setBooks(transformed);
        }
      }
    },
    [books]
  );

  // Sort books based on sortBy
  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "neglected":
        return sorted.sort((a, b) => {
          const aDays = a.days_since_last_read ?? 0;
          const bDays = b.days_since_last_read ?? 0;
          return bDays - aDays;
        });
      case "progress":
        return sorted.sort((a, b) => {
          const aProgress = a.totalPages > 0 ? a.pagesRead / a.totalPages : 0;
          const bProgress = b.totalPages > 0 ? b.pagesRead / b.totalPages : 0;
          return bProgress - aProgress;
        });
      case "newest":
        return sorted.sort((a, b) => {
          const aDays = a.days_since_last_read ?? 0;
          const bDays = b.days_since_last_read ?? 0;
          return aDays - bDays; // Lower days = newer pause
        });
      case "oldest":
        return sorted.sort((a, b) => {
          const aDays = a.days_since_last_read ?? 0;
          const bDays = b.days_since_last_read ?? 0;
          return bDays - aDays; // Higher days = older pause
        });
      case "title":
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case "shortest":
        return sorted.sort((a, b) => (a.totalPages || 0) - (b.totalPages || 0));
      default:
        return sorted;
    }
  }, [books, sortBy]);

  // Calculate stats for ShelfStats
  const { averagePauseDuration, totalPagesInLimbo } = useMemo(() => {
    const validDays = books
      .map((book) => book.days_since_last_read)
      .filter((days): days is number => days !== null);

    const avgDuration =
      validDays.length > 0
        ? Math.round(
            validDays.reduce((sum, days) => sum + days, 0) / validDays.length
          )
        : 0;

    const totalPages = books.reduce(
      (sum, book) => sum + (book.totalPages - book.pagesRead),
      0
    );

    return {
      averagePauseDuration: avgDuration,
      totalPagesInLimbo: totalPages,
    };
  }, [books]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ShelfHeader
        shelfName="Paused"
        bookCount={books.length}
        shelfType="paused"
        onSortChange={setSortBy}
        currentSort={sortBy}
      />

      {/* Main Content */}
      <main className="flex-1">
        <section className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Shelf Navigation */}
            <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/50 rounded-lg border border-border">
              <span className="text-sm font-medium text-muted-foreground">
                Shelves:
              </span>
              {SHELVES.map((shelf) => {
                const href = `/shelves/${shelf.status}`;
                const isActive = pathname === href;
                const Icon = shelf.icon;
                return (
                  <Link
                    key={shelf.status}
                    href={href}
                    className={`
                      inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                      ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {shelf.label}
                  </Link>
                );
              })}
            </div>

            {/* Stats Section */}
            <ShelfStats
              books={books.map((b) => ({
                pagesRead: b.pagesRead,
                totalPages: b.totalPages,
              }))}
              variant="paused"
              averagePauseDuration={averagePauseDuration}
              totalPagesInLimbo={totalPagesInLimbo}
            />

            {/* Decision Banner */}
            <DashboardCard icon={AlertCircle} title="Decision Time">
              <p className="text-sm text-foreground">
                You have{" "}
                <span className="font-semibold text-foreground">
                  {books.length} book{books.length !== 1 ? "s" : ""} on hold
                </span>
                . Statistically, if a book stays here longer than 30 days, it
                moves to DNF. Ready to jump back in or clear the shelf?
              </p>
            </DashboardCard>

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Pause className="w-5 h-5" />
                Your Paused Books ({sortedBooks.length})
              </h2>
              {sortedBooks.length > 0 ? (
                <ShelfBookGrid
                  books={sortedBooks.map((b) => ({
                    id: b.id,
                    title: b.title,
                    author: b.author,
                    cover: b.cover,
                    pagesRead: b.pagesRead,
                    totalPages: b.totalPages,
                    rating: b.rating,
                    reviewAttributes: b.reviewAttributes,
                    status: b.status,
                    days_since_last_read: b.days_since_last_read,
                    latest_journal_entry: b.latest_journal_entry,
                  }))}
                  sortBy={sortBy}
                  onStatusChange={handleStatusChange}
                  onRatingUpdate={handleRatingUpdate}
                  isPausedShelf={true}
                />
              ) : (
                <DashboardCard
                  icon={Pause}
                  title="No paused books yet"
                  description="Books you pause will appear here."
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
