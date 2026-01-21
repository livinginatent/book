"use client";

import { BookOpen, Sparkles, Loader2, Shuffle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import { updateBookReview } from "@/app/actions/reviews";
import { getWantToReadBooks } from "@/app/actions/want-to-read";
import { ShelfBookGrid } from "@/components/shelves/shelf-book-grid";
import { ShelfHeader } from "@/components/shelves/shelf-header";
import { ShelfStats } from "@/components/shelves/shelf-stats";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import type { ReadingStatus } from "@/types/database.types";

// Simple toast implementation
const toast = {
  success: (message: string) => {
    // In a real app, you'd use a toast library like sonner or react-hot-toast
    console.log("Success:", message);
    // For now, we'll use alert as a simple notification
    // In production, replace with proper toast library
    if (typeof window !== "undefined") {
      alert(message);
    }
  },
  error: (message: string) => {
    console.error("Error:", message);
    if (typeof window !== "undefined") {
      alert(message);
    }
  },
};

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
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
  date_added?: string;
  isPrioritized?: boolean;
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

export default function WantToReadShelfPage() {
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
  const [suggestedBook, setSuggestedBook] = useState<ShelfBook | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Transform function for books
  const transformBooks = useCallback((result: Awaited<ReturnType<typeof getWantToReadBooks>>) => {
    if (!result.success) return [];
    return result.books.map((book) => {
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
          book.cover_url_large ||
          book.cover_url_medium ||
          book.cover_url_small ||
          "",
        totalPages: book.page_count || 0,
        rating: book.userBook?.rating,
        reviewAttributes: reviewAttrs || {},
        date_added: book.date_added,
        isPrioritized: book.isPrioritized,
      };
    });
  }, []);

  // Fetch want-to-read books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getWantToReadBooks();

      if (!isMounted) return;

      if (result.success) {
        setBooks(transformBooks(result));
      } else {
        console.error("Failed to load want-to-read shelf:", result.error);
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
  }, [transformBooks]);

  // Listen for book changes from search/other components
  useEffect(() => {
    const handleBookAdded = (e: Event) => {
      const customEvent = e as CustomEvent<{
        bookId?: string;
        action?: string;
        book?: {
          id: string;
          title: string;
          authors?: string[];
          cover_url_medium?: string;
          cover_url_large?: string;
          cover_url_small?: string;
          page_count?: number;
        };
      }>;
      
      const { action, book } = customEvent.detail || {};
      
      // If book is being added as want-to-read, add optimistically
      if (action === "want-to-read" && book) {
        const newBook: ShelfBook = {
          id: book.id,
          title: book.title,
          author: book.authors?.join(", ") || "Unknown Author",
          cover: book.cover_url_large || book.cover_url_medium || book.cover_url_small || "",
          totalPages: book.page_count || 0,
          rating: null,
          reviewAttributes: {},
          date_added: new Date().toISOString(),
          isPrioritized: false,
        };
        
        setBooks((prev) => {
          if (prev.some((b) => b.id === book.id)) return prev;
          return [newBook, ...prev];
        });
      }
    };

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
        };
      }>;
      
      const { bookId, newStatus, book } = customEvent.detail || {};
      
      // If changing TO want_to_read, add optimistically
      if (newStatus === "want_to_read" && book) {
        const newBook: ShelfBook = {
          id: book.id,
          title: book.title,
          author: book.authors?.join(", ") || "Unknown Author",
          cover: book.cover_url_large || book.cover_url_medium || book.cover_url_small || "",
          totalPages: book.page_count || 0,
          rating: null,
          reviewAttributes: {},
          date_added: new Date().toISOString(),
          isPrioritized: false,
        };
        
        setBooks((prev) => {
          if (prev.some((b) => b.id === book.id)) return prev;
          return [newBook, ...prev];
        });
      } else if (bookId && newStatus && newStatus !== "want_to_read") {
        // If changing FROM want_to_read, remove optimistically
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
      }
    };

    // Handle error events - remove optimistically added books on failure
    const handleAddFailed = (e: Event) => {
      const customEvent = e as CustomEvent<{ bookId?: string; action?: string }>;
      const { bookId, action } = customEvent.detail || {};
      if (action === "want-to-read" && bookId) {
        setBooks((prev) => prev.filter((b) => b.id !== bookId));
      }
    };

    window.addEventListener("book-added", handleBookAdded);
    window.addEventListener("book-status-changed", handleStatusChanged);
    window.addEventListener("book-add-failed", handleAddFailed);

    return () => {
      window.removeEventListener("book-added", handleBookAdded);
      window.removeEventListener("book-status-changed", handleStatusChanged);
      window.removeEventListener("book-add-failed", handleAddFailed);
    };
  }, []);

  const handleRemove = useCallback(
    async (bookId: string, _currentStatus: ReadingStatus) => {
      // Optimistically remove from UI
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

      const result = await removeBookFromReadingList(bookId, "want-to-read");

      if (!result.success) {
        console.error("Failed to remove book:", result.error);
        toast.error(result.error);
        // Revert by refetching
        const fetchResult = await getWantToReadBooks();
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
            totalPages: book.page_count || 0,
            rating: book.userBook?.rating,
            reviewAttributes: (book.userBook?.review_attributes as
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
              | undefined) || {},
            date_added: book.date_added,
            isPrioritized: book.isPrioritized,
          }));
          setBooks(transformed);
        }
      }
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
        const fetchResult = await getWantToReadBooks();
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
                book.cover_url_large ||
                book.cover_url_medium ||
                book.cover_url_small ||
                "",
              totalPages: book.page_count || 0,
              rating: book.userBook?.rating,
              reviewAttributes: reviewAttrs || {},
              date_added: book.date_added,
              isPrioritized: book.isPrioritized,
            };
          });
          setBooks(transformed);
        }
      }
    },
    [books]
  );

  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const fetchResult = await getWantToReadBooks();
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
            totalPages: book.page_count || 0,
            rating: book.userBook?.rating,
            reviewAttributes: (book.userBook?.review_attributes as
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
              | undefined) || {},
            date_added: book.date_added,
            isPrioritized: book.isPrioritized,
          }));
          setBooks(transformed);
        }
        return;
      }

      // If status is "reading" (currently_reading), redirect to currently-reading page
      if (status === "currently_reading") {
        toast.success("Book moved to Currently Reading!");
        router.push("/shelves/currently-reading");
        return;
      }

      // Remove from UI when status changes away from want-to-read
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    },
    [router]
  );

  // Calculate derived values
  const { totalPageCount, averageBookLength } = useMemo(() => {
    const totalPages = books.reduce(
      (sum, book) => sum + (book.totalPages || 0),
      0
    );
    const avgLength =
      books.length > 0 ? Math.round(totalPages / books.length) : 0;

    return {
      totalPageCount: totalPages,
      averageBookLength: avgLength,
    };
  }, [books]);

  // Pick a random book
  const handlePickForMe = useCallback(() => {
    if (books.length === 0) return;
    const randomIndex = Math.floor(Math.random() * books.length);
    setSuggestedBook(books[randomIndex] || null);
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
        shelfName="Want to Read"
        bookCount={books.length}
        shelfType="want-to-read"
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
                pagesRead: 0,
                totalPages: b.totalPages,
              }))}
              totalPagesLeft={totalPageCount}
              variant="want-to-read"
            />

            {/* Motivation Banner */}
            <DashboardCard
              icon={Sparkles}
              title="Your Reading Queue"
              description={
                averageBookLength > 0
                  ? `Average book length: ${averageBookLength.toLocaleString()} pages. Plan your next adventure!`
                  : "Start building your reading list!"
              }
              action={
                books.length > 0 ? (
                  <Button
                    onClick={handlePickForMe}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Shuffle className="w-4 h-4" />
                    Pick for Me
                  </Button>
                ) : null
              }
            >
              {suggestedBook ? (
                <p className="text-sm text-muted-foreground">
                  Feeling indecisive? We suggest starting{" "}
                  <span className="font-semibold text-foreground">
                    {suggestedBook.title}
                  </span>{" "}
                  today!
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {books.length > 0
                    ? `You have ${books.length} book${
                        books.length !== 1 ? "s" : ""
                      } waiting to be read. Click "Pick for Me" to get a random suggestion!`
                    : "Add books to your want-to-read list to get started."}
                </p>
              )}
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
                  pagesRead: 0,
                  rating: b.rating,
                  reviewAttributes: b.reviewAttributes,
                  status: "want_to_read" as ReadingStatus,
                }))}
                sortBy={sortBy}
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
