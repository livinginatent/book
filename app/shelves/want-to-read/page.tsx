"use client";

import { BookOpen, Sparkles, Loader2, Shuffle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
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

  // Fetch want-to-read books from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getWantToReadBooks();

      if (!isMounted) return;

      if (result.success) {
        const transformed: ShelfBook[] = result.books.map((book) => ({
          id: book.id,
          title: book.title,
          author: book.authors?.join(", ") || "Unknown Author",
          cover:
            book.cover_url_large ||
            book.cover_url_medium ||
            book.cover_url_small ||
            "",
          totalPages: book.page_count || 0,
          date_added: book.date_added,
          isPrioritized: book.isPrioritized,
        }));

        setBooks(transformed);
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
            date_added: book.date_added,
            isPrioritized: book.isPrioritized,
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
                  status: "want_to_read" as ReadingStatus,
                }))}
                sortBy={sortBy}
                onStatusChange={handleStatusChange}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
