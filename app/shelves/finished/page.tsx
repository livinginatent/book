"use client";

import { BookOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getFinishedBooks } from "@/app/actions/read-shelf";
import { updateBookReview } from "@/app/actions/reviews";
import { useProfile } from "@/components/providers/auth-provider";
import { ShelfBookGrid } from "@/components/shelves/shelf-book-grid";
import { ShelfHeader } from "@/components/shelves/shelf-header";
import { ShelfStats } from "@/components/shelves/shelf-stats";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ReadingStatus } from "@/types";

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
  subjects?: string[] | null;
  dateFinished?: string | null;
  status?: ReadingStatus;
}

// Shelf navigation configuration
const SHELVES = [
  { status: "currently-reading", label: "Currently Reading", icon: BookOpen },
  { status: "want-to-read", label: "Want to Read", icon: BookOpen },
  { status: "read", label: "Finished", icon: BookOpen },
  { status: "paused", label: "Paused", icon: BookOpen },
  { status: "did-not-finish", label: "Did Not Finish", icon: BookOpen },
  { status: "up-next", label: "Up Next", icon: BookOpen },
] as const;

export default function ReadShelfPage() {
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const pathname = usePathname();
  const { isPremium } = useProfile();

  // Fetch finished books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const year = selectedYear || undefined;
      const result = await getFinishedBooks(year);

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
            pagesRead: book.page_count || 0,
            totalPages: book.page_count || 0,
            rating: book.userBook.rating,
            reviewAttributes: reviewAttrs || {},
            subjects: book.subjects,
            dateFinished: book.userBook.date_finished,
            status: book.userBook.status,
          };
        });

        setBooks(transformed);
      } else {
        console.error("Failed to load finished books shelf:", result.error);
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
  }, [selectedYear]);

  const handleShareYear = useCallback(() => {
    if (!isPremium) return;

    const year = selectedYear || new Date().getFullYear();
    const yearBooks = books;
    const totalBooks = yearBooks.length;
    const avgRating =
      yearBooks.filter((b) => b.rating && b.rating > 0).length > 0
        ? (
            yearBooks
              .filter((b) => b.rating && b.rating > 0)
              .reduce((sum, b) => sum + (b.rating || 0), 0) /
            yearBooks.filter((b) => b.rating && b.rating > 0).length
          ).toFixed(1)
        : "N/A";

    // Generate share text
    const shareText =
      `📚 My ${year} Reading Year 📚\n\n` +
      `📖 ${totalBooks} books read\n` +
      `⭐ Average rating: ${avgRating}\n\n` +
      `What was your reading year like?`;

    // Try to share using Web Share API, fallback to clipboard
    if (navigator.share) {
      navigator
        .share({
          title: `My ${year} Reading Year`,
          text: shareText,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
          // Fallback to clipboard
          navigator.clipboard.writeText(shareText);
          alert("Reading summary copied to clipboard!");
        });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText);
      alert("Reading summary copied to clipboard!");
    }
  }, [books, selectedYear, isPremium]);

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
        const fetchResult = await getFinishedBooks(selectedYear || undefined);
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
              pagesRead: book.page_count || 0,
              totalPages: book.page_count || 0,
              rating: book.userBook.rating,
              reviewAttributes: reviewAttrs || {},
              subjects: book.subjects,
              dateFinished: book.userBook.date_finished,
              status: book.userBook.status,
            };
          });
          setBooks(transformed);
        }
      }
    },
    [books, selectedYear]
  );

  // Sort books based on sortBy
  const sortedBooks = useMemo(() => {
    const sorted = [...books];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => {
          if (!a.dateFinished) return 1;
          if (!b.dateFinished) return -1;
          return (
            new Date(b.dateFinished).getTime() -
            new Date(a.dateFinished).getTime()
          );
        });
      case "oldest":
        return sorted.sort((a, b) => {
          if (!a.dateFinished) return 1;
          if (!b.dateFinished) return -1;
          return (
            new Date(a.dateFinished).getTime() -
            new Date(b.dateFinished).getTime()
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
        shelfName="Finished"
        bookCount={books.length}
        shelfType="finished"
        onSortChange={setSortBy}
        currentSort={sortBy}
        onYearChange={setSelectedYear}
        currentYear={selectedYear}
        onShareYear={handleShareYear}
        isPremium={isPremium}
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
                rating: b.rating,
                subjects: b.subjects,
              }))}
              variant="read"
            />

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your Finished Books ({sortedBooks.length})
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
                    dateFinished: b.dateFinished,
                  }))}
                  sortBy={sortBy}
                  onRatingUpdate={handleRatingUpdate}
                />
              ) : (
                <DashboardCard
                  icon={BookOpen}
                  title="No finished books yet"
                  description="Start reading and mark books as finished to see them here!"
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
