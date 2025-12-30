"use client";

import { BookOpen, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import { getCurrentlyReadingBooks } from "@/app/actions/currently-reading";
import { updateReadingProgress } from "@/app/actions/reading-progress";
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
  lastReadDate?: Date | null;
  velocity?: number;
  pages_left?: number;
  date_added?: string;
}

// Shelf navigation configuration
const SHELVES = [
  { status: "currently-reading", label: "Currently Reading", icon: BookOpen },
  { status: "want-to-read", label: "Want to Read", icon: BookOpen },
  { status: "finished", label: "Finished", icon: BookOpen },
  { status: "paused", label: "Paused", icon: BookOpen },
  { status: "did-not-finish", label: "Did Not Finish", icon: BookOpen },
  { status: "up-next", label: "Up Next", icon: BookOpen },
] as const;

export default function CurrentlyReadingShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [sortBy, setSortBy] = useState<
    | "progress"
    | "added"
    | "title"
    | "neglected"
    | "oldest"
    | "newest"
    | "shortest"
  >("progress");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Fetch currently reading books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getCurrentlyReadingBooks();

      if (!isMounted) return;

      if (result.success) {
        const transformed: ShelfBook[] = result.books.map((book) => {
          const reviewAttrs = book.userBook?.review_attributes as
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
            | null
            | undefined;
          return {
            id: book.id,
            title: book.title,
            author: book.authors?.join(", ") || "Unknown Author",
            cover:
              book.cover_url_medium ||
              book.cover_url_large ||
              book.cover_url_small ||
              "",
            pagesRead: book.progress?.pages_read || 0,
            totalPages: book.page_count || 0,
            rating: book.userBook?.rating,
            reviewAttributes: reviewAttrs || {},
            lastReadDate: book.lastReadDate,
            velocity: book.velocity,
            pages_left: book.pages_left,
            date_added: book.date_added,
          };
        });

        setBooks(transformed);
      } else {
        console.error("Failed to load currently reading shelf:", result.error);
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
        const fetchResult = await getCurrentlyReadingBooks();
        if (fetchResult.success) {
          const transformed: ShelfBook[] = fetchResult.books.map((book) => {
            const reviewAttrs = book.userBook?.review_attributes as
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
              | null
              | undefined;
            return {
              id: book.id,
              title: book.title,
              author: book.authors?.join(", ") || "Unknown Author",
              cover:
                book.cover_url_medium ||
                book.cover_url_large ||
                book.cover_url_small ||
                "",
              pagesRead: book.progress?.pages_read || 0,
              totalPages: book.page_count || 0,
              rating: book.userBook?.rating,
              reviewAttributes: reviewAttrs || {},
              lastReadDate: book.lastReadDate,
              velocity: book.velocity,
              pages_left: book.pages_left,
              date_added: book.date_added,
            };
          });
          setBooks(transformed);
        }
      }
    },
    [books]
  );

  const handleProgressUpdate = useCallback(
    async (bookId: string, pages: number) => {
      // Optimistic update
      setBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, pagesRead: pages } : book
        )
      );

      const result = await updateReadingProgress(bookId, pages);
      if (!result.success) {
        console.error("Failed to update progress:", result.error);
        // Revert on error by refetching
        const fetchResult = await getCurrentlyReadingBooks();
        if (fetchResult.success) {
          const transformed: ShelfBook[] = fetchResult.books.map((book) => {
            const reviewAttrs = book.userBook?.review_attributes as
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
              | null
              | undefined;
            return {
              id: book.id,
              title: book.title,
              author: book.authors?.join(", ") || "Unknown Author",
              cover:
                book.cover_url_medium ||
                book.cover_url_large ||
                book.cover_url_small ||
                "",
              pagesRead: book.progress?.pages_read || 0,
              totalPages: book.page_count || 0,
              rating: book.userBook?.rating,
              reviewAttributes: reviewAttrs || {},
              lastReadDate: book.lastReadDate,
              velocity: book.velocity,
              pages_left: book.pages_left,
              date_added: book.date_added,
            };
          });
          setBooks(transformed);
        }
      }
    },
    []
  );

  // Calculate derived values
  const { totalPagesLeft, forgottenBook, avgVelocity, daysToFinish } =
    useMemo(() => {
      const totalPagesLeft = books.reduce(
        (sum, book) => sum + (book.pages_left || 0),
        0
      );

      // Check if any book hasn't been read in > 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const forgottenBook = books.find((book) => {
        if (!book.lastReadDate) return true; // Never read
        try {
          const lastRead = new Date(book.lastReadDate);
          if (isNaN(lastRead.getTime())) return true; // Invalid date
          return lastRead < threeDaysAgo;
        } catch {
          return true; // Error parsing date
        }
      });

      const totalVelocity = books.reduce(
        (sum, book) => sum + (book.velocity || 0),
        0
      );
      const avgVelocity = books.length > 0 ? totalVelocity / books.length : 0;
      const daysToFinish =
        avgVelocity > 0 && totalPagesLeft > 0
          ? Math.ceil(totalPagesLeft / avgVelocity)
          : 0;

      return { totalPagesLeft, forgottenBook, avgVelocity, daysToFinish };
    }, [books]);

  const handleRemove = useCallback(
    async (bookId: string, _currentStatus: ReadingStatus) => {
      // Optimistically remove from UI
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

      const result = await removeBookFromReadingList(
        bookId,
        "currently-reading"
      );

      if (!result.success) {
        console.error("Failed to remove book:", result.error);
        // Revert by refetching
        const fetchResult = await getCurrentlyReadingBooks();
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
            pagesRead: book.progress?.pages_read || 0,
            totalPages: book.page_count || 0,
          }));
          setBooks(transformed);
        }
      }
    },
    []
  );

  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const fetchResult = await getCurrentlyReadingBooks();
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
            pagesRead: book.progress?.pages_read || 0,
            totalPages: book.page_count || 0,
            lastReadDate: book.lastReadDate,
            velocity: book.velocity,
            pages_left: book.pages_left,
          }));
          setBooks(transformed);
        }
        return;
      }

      // Remove from UI when status changes away from currently reading
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    },
    []
  );

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
        shelfName="Currently Reading"
        bookCount={books.length}
        shelfType="currently-reading"
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
            <ShelfStats books={books} totalPagesLeft={totalPagesLeft} />

            {/* Motivation Banner */}
            <DashboardCard
              icon={Sparkles}
              title="Keep it up!"
              description={
                forgottenBook
                  ? `Don't forget ${forgottenBook.title}! It's been a few days.`
                  : daysToFinish > 0
                  ? `You're on track to finish all ${books.length} book${
                      books.length !== 1 ? "s" : ""
                    } in approximately ${daysToFinish} day${
                      daysToFinish !== 1 ? "s" : ""
                    }.`
                  : "You're on a great reading streak!"
              }
            >
              <p className="text-sm text-muted-foreground">
                {forgottenBook ? (
                  <>
                    It&apos;s been{" "}
                    <span className="font-semibold text-foreground">
                      {forgottenBook.lastReadDate
                        ? Math.floor(
                            (new Date().getTime() -
                              new Date(forgottenBook.lastReadDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : "many"}{" "}
                      days
                    </span>{" "}
                    since you last read{" "}
                    <span className="font-semibold text-foreground">
                      {forgottenBook.title}
                    </span>
                    . Time to get back into it!
                  </>
                ) : daysToFinish > 0 ? (
                  <>
                    You&apos;re reading at an average of{" "}
                    <span className="font-semibold text-foreground">
                      {Math.round(avgVelocity)} pages per day
                    </span>
                    . With{" "}
                    <span className="font-semibold text-foreground">
                      {totalPagesLeft.toLocaleString()} pages
                    </span>{" "}
                    left across all your books, you&apos;ll finish in
                    approximately{" "}
                    <span className="font-semibold text-foreground">
                      {daysToFinish} day{daysToFinish !== 1 ? "s" : ""}
                    </span>
                    !
                  </>
                ) : (
                  <>
                    You have{" "}
                    <span className="font-semibold text-foreground">
                      {totalPagesLeft.toLocaleString()}
                    </span>{" "}
                    pages left to finish all your current reads!
                  </>
                )}
              </p>
            </DashboardCard>

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your Books ({books.length})
              </h2>
              <ShelfBookGrid
                books={books.map((b) => ({
                  ...b,
                  rating: b.rating,
                  reviewAttributes: b.reviewAttributes,
                  status: "currently_reading" as ReadingStatus,
                }))}
                sortBy={sortBy}
                onProgressUpdate={handleProgressUpdate}
                onStatusChange={handleStatusChange}
                onRemove={handleRemove}
                onRatingUpdate={handleRatingUpdate}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
