"use client";

import { useCallback, useEffect, useState } from "react";
import { ShelfHeader } from "@/components/shelves/shelf-header";
import { ShelfStats } from "@/components/shelves/shelf-stats";
import { ShelfBookGrid } from "@/components/shelves/shelf-book-grid";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BookOpen, Sparkles } from "lucide-react";
import type { BookStatus } from "@/components/ui/book/book-progress-editor";
import { getCurrentlyReadingBooks } from "@/app/actions/currently-reading";
import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import type { ReadingStatus } from "@/types/database.types";

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
}

export default function CurrentlyReadingShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [sortBy, setSortBy] = useState<"progress" | "added" | "title">(
    "progress"
  );
  const [loading, setLoading] = useState(true);

  // Fetch currently reading books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getCurrentlyReadingBooks();

      if (!isMounted) return;

      if (result.success) {
        const transformed: ShelfBook[] = result.books.map((book) => ({
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
    async (bookId: string, status: BookStatus) => {
      if (status === "remove") {
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
        return;
      }

      // Map BookStatus to ReadingStatus
      const statusMap: Record<BookStatus, ReadingStatus | null> = {
        finished: "finished",
        paused: "paused",
        "did-not-finish": "dnf",
        reading: "currently_reading",
        remove: null,
      };

      const readingStatus = statusMap[status];
      if (!readingStatus) {
        // Nothing to update for this status (e.g., "remove" handled above)
        return;
      }

      const result = await updateBookStatus(bookId, readingStatus);

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ShelfHeader
        shelfName="Currently Reading"
        bookCount={books.length}
        onSortChange={setSortBy}
      />

      {/* Main Content */}
      <main className="flex-1">
        <section className="px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Stats Section */}
            <ShelfStats
              books={books}
              totalReadingTime={loading ? "Loading..." : "42h 15m"}
            />

            {/* Motivation Banner */}
            <DashboardCard
              icon={Sparkles}
              title="Keep it up!"
              description="You're on a great reading streak"
            >
              <p className="text-sm text-muted-foreground">
                You&apos;ve read an average of{" "}
                <span className="font-semibold text-foreground">
                  45 pages per day
                </span>{" "}
                this month. Only{" "}
                <span className="font-semibold text-foreground">
                  {books.reduce(
                    (sum, book) => sum + (book.totalPages - book.pagesRead),
                    0
                  )}
                </span>{" "}
                pages left to finish all your current reads!
              </p>
            </DashboardCard>

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your Books ({books.length})
              </h2>
              <ShelfBookGrid
                books={books}
                sortBy={sortBy}
                onProgressUpdate={handleProgressUpdate}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
