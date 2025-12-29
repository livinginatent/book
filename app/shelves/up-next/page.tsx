"use client";

import { BookOpen, Sparkles, Loader2, Calendar, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import {
  getUpNextQueue,
  startReadingNow,
  updateQueueOrder,
} from "@/app/actions/up-next";
import { ShelfHeader } from "@/components/shelves/shelf-header";
import { UpNextBookGrid } from "@/components/shelves/up-next-book-grid";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Progress } from "@/components/ui/progress";
import { Toast } from "@/components/ui/toast";

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
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

export default function UpNextShelfPage() {
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
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [dailyReadingGoal, setDailyReadingGoal] = useState(40);
  const [canAdd, setCanAdd] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState<
    "free" | "bibliophile"
  >("free");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const pathname = usePathname();

  // Fetch up-next queue from the database
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      setLoading(true);
      const result = await getUpNextQueue();

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
          totalPages: book.page_count || 0,
          date_added: book.userBook.date_added,
        }));

        setBooks(transformed);
        setPageCount(result.pageCount);
        setDailyReadingGoal(result.dailyReadingGoal);
        setCanAdd(result.canAdd);
        setSubscriptionTier(result.subscriptionTier);
      } else {
        console.error("Failed to load up-next queue:", result.error);
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

  const handleRemove = useCallback(async (bookId: string) => {
    // Optimistically remove from UI
    setBooks((prev) => prev.filter((book) => book.id !== bookId));

    const result = await removeBookFromReadingList(bookId, "up-next");

    if (!result.success) {
      console.error("Failed to remove book:", result.error);
      // Revert by refetching
      const fetchResult = await getUpNextQueue();
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
          date_added: book.userBook.date_added,
        }));
        setBooks(transformed);
        setPageCount(fetchResult.pageCount);
        setDailyReadingGoal(fetchResult.dailyReadingGoal);
        setCanAdd(fetchResult.canAdd);
        setSubscriptionTier(fetchResult.subscriptionTier);
      }
    } else {
      // Refetch to update canAdd status
      const fetchResult = await getUpNextQueue();
      if (fetchResult.success) {
        setCanAdd(fetchResult.canAdd);
        setPageCount(fetchResult.pageCount);
        setSubscriptionTier(fetchResult.subscriptionTier);
      }
    }
  }, []);

  const handleStartReading = useCallback(
    async (bookId: string) => {
      const book = books.find((b) => b.id === bookId);
      const bookTitle = book?.title || "Book";

      const result = await startReadingNow(bookId);

      if (!result.success) {
        console.error("Failed to start reading:", result.error);
        return;
      }

      // Show success toast
      setToastMessage(`${bookTitle} added to Currently Reading`);
      setShowToast(true);

      // Remove from UI and refetch
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

      const fetchResult = await getUpNextQueue();
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
          date_added: book.userBook.date_added,
        }));
        setBooks(transformed);
        setPageCount(fetchResult.pageCount);
        setCanAdd(fetchResult.canAdd);
        setSubscriptionTier(fetchResult.subscriptionTier);
      }
    },
    [books]
  );

  const handleReorder = useCallback(
    async (bookIds: string[]) => {
      const result = await updateQueueOrder(bookIds);

      if (!result.success) {
        console.error("Failed to reorder books:", result.error);
        // Revert by refetching
        const fetchResult = await getUpNextQueue();
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
            date_added: book.userBook.date_added,
          }));
          setBooks(transformed);
          setSubscriptionTier(fetchResult.subscriptionTier);
        }
        return;
      }

      // Optimistically update the order
      const reorderedBooks = bookIds
        .map((id) => books.find((b) => b.id === id))
        .filter((b): b is ShelfBook => b !== undefined);

      // Keep any books that weren't in the reorder list (shouldn't happen, but safety)
      const remainingBooks = books.filter((b) => !bookIds.includes(b.id));

      setBooks([...reorderedBooks, ...remainingBooks]);
    },
    [books]
  );

  const _handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const fetchResult = await getUpNextQueue();
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
            date_added: book.userBook.date_added,
          }));
          setBooks(transformed);
          setPageCount(fetchResult.pageCount);
          setCanAdd(fetchResult.canAdd);
          setSubscriptionTier(fetchResult.subscriptionTier);
        }
        return;
      }

      // Remove from UI when status changes away from up_next
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

      // Refetch to update canAdd status
      const fetchResult = await getUpNextQueue();
      if (fetchResult.success) {
        setCanAdd(fetchResult.canAdd);
        setPageCount(fetchResult.pageCount);
        setSubscriptionTier(fetchResult.subscriptionTier);
      }
    },
    []
  );

  // Calculate derived values
  const { estimatedDaysToClear, capacityUsed, capacityLimit } = useMemo(() => {
    const totalPages = pageCount || 0;
    const estimatedDays =
      dailyReadingGoal > 0 && totalPages > 0
        ? Math.ceil(totalPages / dailyReadingGoal)
        : 0;

    // Determine limit based on subscription tier
    // Free users: 6, Bibliophile: 12
    const currentCount = books.length;
    const limit = subscriptionTier === "bibliophile" ? 12 : 6;

    return {
      estimatedDaysToClear: estimatedDays,
      capacityUsed: currentCount,
      capacityLimit: limit,
    };
  }, [pageCount, dailyReadingGoal, books.length, subscriptionTier]);

  // Calculate when user will start their third book
  const daysToThirdBook = useMemo(() => {
    if (books.length < 2) return null;
    const firstTwoPages = books
      .slice(0, 2)
      .reduce((sum, book) => sum + (book.totalPages || 0), 0);
    return dailyReadingGoal > 0 && firstTwoPages > 0
      ? Math.ceil(firstTwoPages / dailyReadingGoal)
      : null;
  }, [books, dailyReadingGoal]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <ShelfHeader
        shelfName="Up Next"
        bookCount={books.length}
        shelfType="up-next"
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

            {/* Stats Section - Queue Velocity & Capacity Meter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Queue Velocity */}
              <DashboardCard title="Queue Velocity" className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Estimated Days to Clear
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {estimatedDaysToClear > 0 ? estimatedDaysToClear : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pageCount
                        ? `${pageCount.toLocaleString()} pages ÷ ${dailyReadingGoal} pages/day`
                        : "No books in queue"}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </DashboardCard>

              {/* Capacity Meter */}
              <DashboardCard title="Queue Capacity" className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Slots Used
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {capacityUsed} of {capacityLimit}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {canAdd ? "Space available" : "Queue full"}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                  </div>
                  <Progress
                    value={(capacityUsed / capacityLimit) * 100}
                    className="h-2"
                  />
                </div>
              </DashboardCard>
            </div>

            {/* Motivation Banner */}
            <DashboardCard
              icon={Sparkles}
              title="Your reading plan"
              description={
                books.length > 0
                  ? `Your next ${books.length} book${
                      books.length !== 1 ? "s" : ""
                    } ${books.length === 1 ? "is" : "are"} ready. ${
                      daysToThirdBook && books.length >= 2
                        ? `Based on your goal, you'll be starting your third book in approximately ${daysToThirdBook} day${
                            daysToThirdBook !== 1 ? "s" : ""
                          }!`
                        : estimatedDaysToClear > 0
                        ? `At your current pace, you'll clear this queue in approximately ${estimatedDaysToClear} day${
                            estimatedDaysToClear !== 1 ? "s" : ""
                          }.`
                        : "Keep up the great reading!"
                    }`
                  : "Add books to your up-next queue to start planning your reading journey!"
              }
            />

            {/* Books Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Your Queue ({books.length})
              </h2>
              <UpNextBookGrid
                books={books}
                dailyReadingGoal={dailyReadingGoal}
                onStartReading={handleStartReading}
                onReorder={handleReorder}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Toast Notification */}
      <Toast
        message={toastMessage || ""}
        isVisible={showToast}
        onClose={() => {
          setShowToast(false);
          setToastMessage(null);
        }}
      />
    </div>
  );
}
