"use client";

import { Sparkles, Crown, Upload, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";

import {
  removeBookFromReadingList,
  addBookToReadingList,
} from "@/app/actions/book-actions";
import { getCurrentlyReadingBooks } from "@/app/actions/currently-reading";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { AdvancedInsights } from "@/components/dashboard/advanced-insights";
import { BookRecommendations } from "@/components/dashboard/book-recommendations";
import { CurrentlyReading } from "@/components/dashboard/currently-reading";
import { MoodTracker } from "@/components/dashboard/mood-tracker";
import { PrivateShelves } from "@/components/dashboard/private-shelves";
import { ReadingStats } from "@/components/dashboard/reading-stats";
import { BookSearch } from "@/components/search/book-search";
import type { BookStatus } from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

import { GoodreadsImport } from "../import/goodreads-import";

interface CurrentlyReadingBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
}

export function AuthenticatedHome() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, isPremium, isFree } = useProfile();
  const [currentlyReadingBooks, setCurrentlyReadingBooks] = useState<
    CurrentlyReadingBook[]
  >([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const hasLoadedRef = useRef(false);

  const displayName =
    profile?.username || user?.email?.split("@")[0] || "there";

  // Store user ID to use as stable dependency
  const userId = user?.id;

  // Fetch currently reading books - only once on mount or when user ID changes
  useEffect(() => {
    let isMounted = true;

    async function fetchBooks() {
      if (!userId) {
        setCurrentlyReadingBooks([]);
        setLoadingBooks(false);
        hasLoadedRef.current = false;
        return;
      }

      // Only show loading on initial load, not on refetch
      const isInitialLoad = !hasLoadedRef.current;
      if (isInitialLoad) {
        setLoadingBooks(true);
      }

      const result = await getCurrentlyReadingBooks();
      if (result.success && isMounted) {
        // Transform database books to component format
        const transformedBooks: CurrentlyReadingBook[] = result.books.map(
          (book) => ({
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
          })
        );
        setCurrentlyReadingBooks(transformedBooks);
        hasLoadedRef.current = true;
      }
      if (isMounted) {
        setLoadingBooks(false);
      }
    }

    fetchBooks();

    // Listen for book added/status changed events
    const handleBookAdded = () => {
      if (isMounted) {
        fetchBooks();
      }
    };
    
    const handleStatusChange = () => {
      if (isMounted) {
        fetchBooks();
      }
    };
    
    window.addEventListener("book-added", handleBookAdded);
    window.addEventListener("book-status-changed", handleStatusChange);

    return () => {
      isMounted = false;
      window.removeEventListener("book-added", handleBookAdded);
      window.removeEventListener("book-status-changed", handleStatusChange);
    };
  }, [userId]); // Use stable userId instead of user object

  // Handle progress update
  const handleProgressUpdate = useCallback(
    async (bookId: string, pages: number) => {
      // Optimistically update the UI
      setCurrentlyReadingBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, pagesRead: pages } : book
        )
      );

      // Save to database
      const result = await updateReadingProgress(bookId, pages);
      if (!result.success) {
        console.error("Failed to update progress:", result.error);
        // Revert on error - refetch books
        const fetchResult = await getCurrentlyReadingBooks();
        if (fetchResult.success) {
          const transformedBooks: CurrentlyReadingBook[] =
            fetchResult.books.map((book) => ({
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
          setCurrentlyReadingBooks(transformedBooks);
        }
      }
    },
    []
  );

  // Handle status change
  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus) => {
      if (status === "remove") {
        // Remove from UI optimistically
        setCurrentlyReadingBooks((prev) =>
          prev.filter((book) => book.id !== bookId)
        );

        // Call server action to remove book from currently_reading list
        const result = await removeBookFromReadingList(
          bookId,
          "currently-reading"
        );
        if (!result.success) {
          console.error("Failed to remove book:", result.error);
          // Revert on error - refetch books
          const fetchResult = await getCurrentlyReadingBooks();
          if (fetchResult.success) {
            const transformedBooks: CurrentlyReadingBook[] =
              fetchResult.books.map((book) => ({
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
            setCurrentlyReadingBooks(transformedBooks);
          }
        }
      } else {
        // Handle other status changes: move book to different list
        // First remove from currently_reading
        const removeResult = await removeBookFromReadingList(
          bookId,
          "currently-reading"
        );
        if (!removeResult.success) {
          console.error(
            "Failed to remove book from currently reading:",
            removeResult.error
          );
          return;
        }

        // Map BookStatus to BookAction
        // Note: "finished" status doesn't have a corresponding action in the current system
        // We'll just remove it from currently_reading for now
        const statusToAction: Record<
          BookStatus,
          "up-next" | "did-not-finish" | null
        > = {
          finished: null, // Finished books are just removed from currently reading
          paused: "up-next", // Paused books go to up-next
          "did-not-finish": "did-not-finish",
          reading: null, // Already reading
          remove: null, // Handled above
        };

        const action = statusToAction[status];
        if (action) {
          // Add to the new list
          const addResult = await addBookToReadingList(bookId, action);
          if (!addResult.success) {
            console.error("Failed to add book to new list:", addResult.error);
          }
        }

        // Remove from UI since it's no longer "currently reading"
        setCurrentlyReadingBooks((prev) =>
          prev.filter((book) => book.id !== bookId)
        );
      }
    },
    []
  );

  const mockStats = {
    booksRead: 12,
    pagesRead: 3420,
    readingStreak: 7,
    avgPagesPerDay: 45,
  };

  // Show loading skeleton while profile is loading
  if (profileLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-muted rounded-lg w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">
                Welcome back, {displayName}!
              </h1>
              {isPremium && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full  border border-primary/30">
                  <Crown className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Bibliophile
                  </span>
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-lg">
              {isPremium
                ? "Enjoy your premium reading experience"
                : "Continue your reading journey"}
            </p>
          </div>

          {/* Upgrade CTA for free users */}
          {isFree && (
            <Link href="/checkout">
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                <Sparkles className="w-4 h-4" />
                Upgrade to Bibliophile
              </Button>
            </Link>
          )}
        </div>

        {/* Book Search - Available to all users */}
        <div id="book-search" className="mb-8">
          <BookSearch />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Currently Reading - Available to all */}
            <CurrentlyReading
              books={loadingBooks ? [] : currentlyReadingBooks}
              onProgressUpdate={handleProgressUpdate}
              onStatusChange={handleStatusChange}
            />

            {/* Goodreads Import - Collapsible Section */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setShowImport(!showImport)}
                className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-foreground">
                      Import from Goodreads
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bring your reading history to Bookly
                    </p>
                  </div>
                </div>
                {showImport ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>

              {/* Collapsible Content */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  showImport
                    ? "max-h-[2000px] opacity-100"
                    : "max-h-0 opacity-0"
                )}
              >
                <div className="px-6 pb-6 pt-0">
                  <GoodreadsImport
                    onImportComplete={(imported) => {
                      // Refresh currently reading after import
                      window.dispatchEvent(new CustomEvent("book-added"));
                      // Optionally close the import section after successful import
                      if (imported > 0) {
                        setTimeout(() => setShowImport(false), 2000);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Reading Stats - Available to all */}
            <ReadingStats {...mockStats} />

            {/* Advanced Insights - Premium only */}
            <AdvancedInsights locked={isFree} />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Book Recommendations */}
            {isPremium ? (
              // Premium users get priority recommendations
              <BookRecommendations isPriority />
            ) : (
              // Free users get basic recommendations
              <BookRecommendations />
            )}

            {/* Private Shelves - Premium only */}
            <PrivateShelves locked={isFree} />

            {/* Mood Tracker - Premium only */}
            <MoodTracker locked={isFree} />
          </div>
        </div>

        {/* Upgrade Banner for Free Users */}
        {isFree && (
          <div className="mt-12 p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    Unlock Your Full Reading Potential
                  </h3>
                  <p className="text-muted-foreground">
                    Get private shelves, mood tracking, advanced insights, and
                    priority recommendations.
                  </p>
                </div>
              </div>
              <Link href="/checkout">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 whitespace-nowrap"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
