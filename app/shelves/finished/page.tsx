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

  // Transform function for books
  const transformBooks = useCallback((result: Awaited<ReturnType<typeof getFinishedBooks>>) => {
    if (!result.success) return [];
    return result.books.map((book) => {
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
  }, []);

  // Fetch finished books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const year = selectedYear || undefined;
      const result = await getFinishedBooks(year);

      if (!isMounted) return;

      if (result.success) {
        setBooks(transformBooks(result));
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
  }, [selectedYear, transformBooks]);

  // Listen for book changes from search/other components
  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{
        bookId?: string;
        newStatus?: string;
        book?: {
          id: string;
          title: string;
          authors?: string[];
          cover_url_medium?: string;
          cover_url_large?: string;
          cover_url_small?: string;
          page_count?: number;
          subjects?: string[];
        };
      }>;
      
      const { bookId, newStatus, book } = customEvent.detail || {};
      
      // If changing TO finished, add optimistically
      if (newStatus === "finished" && book) {
        const newBook: ShelfBook = {
          id: book.id,
          title: book.title,
          author: book.authors?.join(", ") || "Unknown Author",
          cover: book.cover_url_medium || book.cover_url_large || book.cover_url_small || "",
          pagesRead: book.page_count || 0,
          totalPages: book.page_count || 0,
          rating: null,
          reviewAttributes: {},
          subjects: book.subjects || null,
          dateFinished: new Date().toISOString(),
          status: "finished",
        };
        
        setBooks((prev) => {
          if (prev.some((b) => b.id === book.id)) return prev;
          return [newBook, ...prev];
        });
      } else if (bookId && newStatus && newStatus !== "finished") {
        // If changing FROM finished, remove optimistically
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
      }
    };

    // Handle error events - remove optimistically added books on failure
    const handleStatusChangeFailed = (e: Event) => {
      const customEvent = e as CustomEvent<{ bookId?: string; previousStatus?: string }>;
      const { bookId, previousStatus } = customEvent.detail || {};
      if (previousStatus !== "finished" && bookId) {
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
      }
    };

    window.addEventListener("book-status-changed", handleStatusChanged);
    window.addEventListener("book-status-change-failed", handleStatusChangeFailed);

    return () => {
      window.removeEventListener("book-status-changed", handleStatusChanged);
      window.removeEventListener("book-status-change-failed", handleStatusChangeFailed);
    };
  }, []);

  // Calculate average rating for the current year's books
  const averageRating = useMemo(() => {
    const yearBooks = books;
    const ratedBooks = yearBooks.filter((b) => b.rating && b.rating > 0);
    if (ratedBooks.length === 0) return "N/A";
    const avg =
      ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) /
      ratedBooks.length;
    return avg.toFixed(1);
  }, [books]);

  // Generate share text callback
  const generateShareText = useCallback(() => {
    const year = selectedYear || new Date().getFullYear();
    const totalBooks = books.length;
    const avgRatingText =
      averageRating && averageRating !== "N/A"
        ? `⭐ Average rating: ${averageRating}\n\n`
        : "";

    return (
      `📚 My ${year} Reading Year 📚\n\n` +
      `📖 ${totalBooks} books read\n` +
      avgRatingText +
      `What was your reading year like?`
    );
  }, [books, selectedYear, averageRating]);

  const handleShareYear = useCallback(() => {
    if (!isPremium) return;
    // This is now handled by the modal, but we keep it for backward compatibility
  }, [isPremium]);

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
        averageRating={averageRating}
        onGenerateShareText={generateShareText}
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
