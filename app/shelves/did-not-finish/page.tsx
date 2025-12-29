"use client";

import { BookOpen, Loader2, Heart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { updateBookStatus } from "@/app/actions/book-actions";
import { redeemDNFBook } from "@/app/actions/dnf-redemption";
import { getDNFBooks } from "@/app/actions/dnf-shelf";
import { updateReadingProgress } from "@/app/actions/reading-progress";
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
  pagesSaved: number;
  totalPages: number;
  notes: string | null;
  date_added: string;
  updated_at: string;
  days_before_quitting: number | null;
  status?: ReadingStatus;
}

// Shelf navigation configuration
const SHELVES = [
  { status: "currently-reading", label: "Currently Reading", icon: BookOpen },
  { status: "want-to-read", label: "Want to Read", icon: BookOpen },
  { status: "finished", label: "Finished", icon: BookOpen },
  { status: "paused", label: "Paused", icon: BookOpen },
  { status: "dnf", label: "Did Not Finish", icon: BookOpen },
  { status: "up-next", label: "Up Next", icon: BookOpen },
] as const;

export default function DNFShelfPage() {
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [sortBy, setSortBy] = useState<
    | "progress"
    | "added"
    | "title"
    | "neglected"
    | "oldest"
    | "newest"
    | "shortest"
  >("newest");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  // Fetch DNF books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getDNFBooks();

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
          pagesSaved: book.pages_saved,
          totalPages: book.page_count || 0,
          notes: book.notes,
          date_added: book.date_added,
          updated_at: book.updated_at,
          days_before_quitting: book.days_before_quitting,
          status: book.userBook.status,
        }));

        setBooks(transformed);
      } else {
        console.error("Failed to load DNF books shelf:", result.error);
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

  // Handle progress update
  const handleProgressUpdate = useCallback(
    async (bookId: string, pages: number) => {
      // Optimistically update UI
      setBooks((prev) =>
        prev.map((book) => {
          if (book.id === bookId) {
            const newPagesSaved = Math.max(0, book.totalPages - pages);
            return { ...book, pagesSaved: newPagesSaved };
          }
          return book;
        })
      );

      // Update in database
      const result = await updateReadingProgress(bookId, pages);
      if (!result.success) {
        console.error("Failed to update progress:", result.error);
        // Revert on error by refetching
        const fetchResult = await getDNFBooks();
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
            pagesSaved: book.pages_saved,
            totalPages: book.page_count || 0,
            notes: book.notes,
            date_added: book.date_added,
            updated_at: book.updated_at,
            days_before_quitting: book.days_before_quitting,
            status: book.userBook.status,
          }));
          setBooks(transformed);
        }
      }
    },
    []
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const fetchResult = await getDNFBooks();
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
            pagesSaved: book.pages_saved,
            totalPages: book.page_count || 0,
            notes: book.notes,
            date_added: book.date_added,
            updated_at: book.updated_at,
            days_before_quitting: book.days_before_quitting,
            status: book.userBook.status,
          }));
          setBooks(transformed);
        }
        return;
      }

      // Remove from UI when status changes away from DNF
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    },
    []
  );

  // Handle redemption (give it another shot)
  const handleRedemption = useCallback(async (bookId: string) => {
    const result = await redeemDNFBook(bookId);
    if (result.success) {
      // Remove book from DNF list (it's now in want_to_read)
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    } else {
      console.error("Failed to redeem book:", result.error);
      // Optionally show error toast here
    }
  }, []);

  // Sort books based on sortBy
  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => {
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      case "oldest":
        return sorted.sort((a, b) => {
          return (
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          );
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
  const { totalPagesSaved, approximateBooks, reasonDistribution } =
    useMemo(() => {
      const totalSaved = books.reduce(
        (sum, book) => sum + (book.pagesSaved || 0),
        0
      );

      // Calculate approximate books (using 300 pages as average)
      const avgPagesPerBook = 300;
      const approxBooks = Math.round(totalSaved / avgPagesPerBook);

      // Default reasons we offer (must match exactly)
      const defaultReasons = [
        "Too Slow",
        "Writing Style",
        "Lost Interest",
        "Too Complex",
        "Characters",
        "Plot Issues",
      ];

      // Analyze reason distribution from notes
      const reasonCounts: Record<string, number> = {};

      books.forEach((book) => {
        if (!book.notes || book.notes.trim() === "") {
          return;
        }

        const note = book.notes.trim();

        // Check if note exactly matches a default reason (case-insensitive)
        const matchedDefaultReason = defaultReasons.find(
          (reason) => note.toLowerCase() === reason.toLowerCase()
        );

        if (matchedDefaultReason) {
          // Use exact default reason name
          reasonCounts[matchedDefaultReason] =
            (reasonCounts[matchedDefaultReason] || 0) + 1;
        } else {
          // Group everything else as "Personal Reason"
          reasonCounts["Personal Reason"] =
            (reasonCounts["Personal Reason"] || 0) + 1;
        }
      });

      // Sort by count and take top 5
      const sortedReasons = Object.entries(reasonCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return {
        totalPagesSaved: totalSaved,
        approximateBooks: approxBooks,
        reasonDistribution: sortedReasons,
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

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "title", label: "Title" },
    { value: "shortest", label: "Shortest" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ShelfHeader
        shelfName="Did Not Finish"
        bookCount={books.length}
        onSortChange={setSortBy}
        currentSort={sortBy}
        sortOptions={sortOptions}
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
                pagesRead: b.totalPages - b.pagesSaved,
                totalPages: b.totalPages,
                notes: b.notes,
              }))}
              variant="dnf"
              totalPagesSaved={totalPagesSaved}
              reasonDistribution={reasonDistribution}
            />

            {/* Motivation Banner */}
            <DashboardCard
              icon={Heart}
              title="Time Reclaimed"
              description={
                approximateBooks > 0
                  ? `You've reclaimed enough time to read approximately ${approximateBooks} book${
                      approximateBooks !== 1 ? "s" : ""
                    }. Life is too short for books you don't love!`
                  : "Life is too short for books you don't love!"
              }
            >
              {totalPagesSaved > 0 && (
                <p className="text-sm text-muted-foreground">
                  By choosing not to finish books that weren&apos;t right for
                  you, you&apos;ve saved{" "}
                  <span className="font-semibold text-foreground">
                    {totalPagesSaved.toLocaleString()} pages
                  </span>{" "}
                  of reading time. That&apos;s time you can spend on books
                  you&apos;ll actually enjoy!
                </p>
              )}
            </DashboardCard>

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your DNF Books ({sortedBooks.length})
              </h2>
              {sortedBooks.length > 0 ? (
                <ShelfBookGrid
                  books={sortedBooks.map((b) => ({
                    id: b.id,
                    title: b.title,
                    author: b.author,
                    cover: b.cover,
                    pagesRead: b.totalPages - b.pagesSaved,
                    totalPages: b.totalPages,
                    status: b.status,
                    notes: b.notes,
                  }))}
                  sortBy={sortBy}
                  onProgressUpdate={handleProgressUpdate}
                  onStatusChange={handleStatusChange}
                  onRedemption={handleRedemption}
                  isDNFShelf={true}
                />
              ) : (
                <DashboardCard
                  icon={BookOpen}
                  title="No DNF books yet"
                  description="Books you mark as 'Did Not Finish' will appear here."
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
