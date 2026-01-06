"use client";

import { Sparkles, Crown, Upload, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import type {
  DashboardData,
  BookWithProgress,
} from "@/app/actions/dashboard-data";
import { refreshCurrentlyReading } from "@/app/actions/dashboard-data";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { AdvancedInsights } from "@/components/dashboard/advanced-insights";
import { BookRecommendations } from "@/components/dashboard/book-recommendations";
import { CurrentlyReading } from "@/components/dashboard/currently-reading";
import { MoodTracker } from "@/components/dashboard/mood-tracker";
import { PrivateShelves } from "@/components/dashboard/private-shelves";
import { ReadingStats } from "@/components/dashboard/reading-stats";
import { BookSearch } from "@/components/search/book-search";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GoodreadsImport } from "../import/goodreads-import";
import { ReadingGoalsContainer } from "../reading-goals";

interface CurrentlyReadingBook {
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
    diverse_cast?: boolean;
    character_development?: boolean;
    plot_driven?: boolean;
  };
  dateStarted?: string | null;
}

interface AuthenticatedHomeProps {
  initialData: DashboardData;
}

// Memoized child components to prevent re-renders
const MemoizedBookSearch = memo(BookSearch);
const MemoizedCurrentlyReading = memo(CurrentlyReading);
const MemoizedReadingGoalsContainer = memo(ReadingGoalsContainer);
const MemoizedReadingStats = memo(ReadingStats);
const MemoizedAdvancedInsights = memo(AdvancedInsights);
const MemoizedBookRecommendations = memo(BookRecommendations);
const MemoizedPrivateShelves = memo(PrivateShelves);
const MemoizedMoodTracker = memo(MoodTracker);
const MemoizedGoodreadsImport = memo(GoodreadsImport);

// Transform database books to component format
function transformBooks(books: BookWithProgress[]): CurrentlyReadingBook[] {
  return books.map((book) => {
    const reviewAttrs = book.userBook?.review_attributes as
      | {
          moods?: string[];
          pacing?: string | null;
          diverse_cast?: boolean;
          character_development?: boolean;
          plot_driven?: boolean;
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
      rating: book.userBook?.rating ?? null,
      reviewAttributes: reviewAttrs || undefined,
      dateStarted:
        book.progress?.started_at || book.userBook?.date_started || null,
    };
  });
}

export function AuthenticatedHome({ initialData }: AuthenticatedHomeProps) {
  // Use pre-fetched data from server - NO client-side auth fetching!
  const {
    user,
    profile,
    currentlyReading,
    shelves: initialShelves,
    goals: initialGoals,
    insights: initialInsights,
    moodSummary: initialMoodSummary,
  } = initialData;

  // Derive auth info from pre-fetched data
  const isPremium = profile?.subscription_tier === "bibliophile";
  const isFree =
    profile?.subscription_tier === "free" || !profile?.subscription_tier;

  // State initialized from server data
  const [currentlyReadingBooks, setCurrentlyReadingBooks] = useState<
    CurrentlyReadingBook[]
  >(() => transformBooks(currentlyReading));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingBooks, setLoadingBooks] = useState(false); // Start as false since we have initial data!
  const [showImport, setShowImport] = useState(false);

  const hasInitializedImportRef = useRef(false);
  const isMountedRef = useRef(true);

  // Memoize display name
  const displayName = useMemo(
    () => profile?.username || user.email?.split("@")[0] || "there",
    [profile?.username, user.email]
  );

  // Check if user has imported from Goodreads
  const shouldHighlightImport = useMemo(
    () => profile !== null && !profile.has_imported_from_goodreads,
    [profile]
  );

  // Auto-expand the import section for new users
  useEffect(() => {
    if (shouldHighlightImport && !hasInitializedImportRef.current) {
      hasInitializedImportRef.current = true;
      requestAnimationFrame(() => {
        setShowImport(true);
      });
    }
  }, [shouldHighlightImport]);

  // Listen for book changes (from search, import, etc.)
  useEffect(() => {
    isMountedRef.current = true;

    const refreshData = async () => {
      if (!isMountedRef.current) return;

      // Use lightweight refresh instead of full dashboard refetch
      const booksResult = await refreshCurrentlyReading();

      if (!isMountedRef.current) return;

      if (booksResult.success && booksResult.books) {
        setCurrentlyReadingBooks(transformBooks(booksResult.books));
      }

      // Trigger reading stats refresh via custom event
      window.dispatchEvent(new CustomEvent("refresh-reading-stats"));
    };

    window.addEventListener("book-added", refreshData);
    window.addEventListener("book-status-changed", refreshData);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("book-added", refreshData);
      window.removeEventListener("book-status-changed", refreshData);
    };
  }, []);

  // Handle progress update - optimistic UI
  const handleProgressUpdate = useCallback(
    async (bookId: string, pages: number) => {
      // Optimistically update the UI
      setCurrentlyReadingBooks((prev) =>
        prev.map((book) =>
          book.id === bookId ? { ...book, pagesRead: pages } : book
        )
      );

      const result = await updateReadingProgress(bookId, pages);

      if (!result.success) {
        console.error("Failed to update progress:", result.error);
        // Revert on error
        const refreshResult = await refreshCurrentlyReading();
        if (refreshResult.success && refreshResult.books) {
          setCurrentlyReadingBooks(transformBooks(refreshResult.books));
        }
      } else {
        // Trigger reading stats refresh via custom event
        window.dispatchEvent(new CustomEvent("refresh-reading-stats"));
      }
    },
    []
  );

  // Handle remove - optimistic UI
  const handleRemove = useCallback(async (bookId: string) => {
    // Remove from UI optimistically
    setCurrentlyReadingBooks((prev) =>
      prev.filter((book) => book.id !== bookId)
    );

    const result = await removeBookFromReadingList(bookId, "currently-reading");
    if (!result.success) {
      console.error("Failed to remove book:", result.error);
      const refreshResult = await refreshCurrentlyReading();
      if (refreshResult.success && refreshResult.books) {
        setCurrentlyReadingBooks(transformBooks(refreshResult.books));
      }
    }
  }, []);

  // Handle status change - optimistic UI
  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);
      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        const refreshResult = await refreshCurrentlyReading();
        if (refreshResult.success && refreshResult.books) {
          setCurrentlyReadingBooks(transformBooks(refreshResult.books));
        }
        return;
      }

      // Remove from UI since it's no longer "currently reading"
      setCurrentlyReadingBooks((prev) =>
        prev.filter((book) => book.id !== bookId)
      );
    },
    []
  );

  // Handle rating update - optimistic UI
  const handleRatingUpdate = useCallback(
    async (bookId: string, rating: number) => {
      // Update UI optimistically
      setCurrentlyReadingBooks((prev) =>
        prev.map((book) => (book.id === bookId ? { ...book, rating } : book))
      );

      // Refresh to get latest data (including review_attributes)
      const refreshResult = await refreshCurrentlyReading();
      if (refreshResult.success && refreshResult.books) {
        setCurrentlyReadingBooks(transformBooks(refreshResult.books));
      }
    },
    []
  );

  // Handle import complete
  const handleImportComplete = useCallback(async (imported: number) => {
    window.dispatchEvent(new CustomEvent("book-added"));
    if (imported > 0) {
      window.dispatchEvent(new CustomEvent("profile-refresh"));
      setTimeout(() => setShowImport(false), 2000);
    }
  }, []);

  // Toggle import visibility
  const toggleImport = useCallback(() => {
    setShowImport((prev) => !prev);
  }, []);

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
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-primary/30">
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
          <MemoizedBookSearch />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Currently Reading - Available to all */}
            <MemoizedCurrentlyReading
              books={loadingBooks ? [] : currentlyReadingBooks}
              onProgressUpdate={handleProgressUpdate}
              onStatusChange={handleStatusChange}
              onRemove={handleRemove}
              onRatingUpdate={handleRatingUpdate}
            />

            {/* Private Shelves - Show on mobile here, hide on desktop (shown in sidebar) */}
            <div className="lg:hidden">
              <MemoizedPrivateShelves
                locked={isFree}
                initialShelves={initialShelves}
              />
            </div>

            {/* Reading Goals */}
            <MemoizedReadingGoalsContainer
              initialProfile={profile}
              initialGoals={initialGoals}
            />

            {/* Goodreads Import - Collapsible Section */}
            {!profile?.has_imported_from_goodreads && (
              <div
                className={cn(
                  "bg-card rounded-2xl border overflow-hidden transition-all duration-500",
                  shouldHighlightImport
                    ? "border-primary shadow-lg shadow-primary/20 animate-pulse"
                    : "border-border"
                )}
              >
                <button
                  onClick={toggleImport}
                  className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                        shouldHighlightImport
                          ? "bg-primary/20 scale-110"
                          : "bg-primary/10"
                      )}
                    >
                      <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          Import from Goodreads
                        </h3>
                        {shouldHighlightImport && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                            <span className="text-xs font-medium text-primary">
                              New
                            </span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {shouldHighlightImport
                          ? "Get started by importing your reading history"
                          : "Bring your reading history to Booktab"}
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
                    <MemoizedGoodreadsImport
                      onImportComplete={handleImportComplete}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reading Stats - Available to all */}
            <MemoizedReadingStats />

            {/* Advanced Insights - Premium only */}
            <MemoizedAdvancedInsights
              locked={isFree}
              initialData={initialInsights}
            />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Book Recommendations */}
            <MemoizedBookRecommendations isPriority={isPremium} />

            {/* Private Shelves - Hidden on mobile (shown above reading goals in main column) */}
            <div className="hidden lg:block">
              <MemoizedPrivateShelves
                locked={isFree}
                initialShelves={initialShelves}
              />
            </div>

            {/* Mood Tracker - Premium only */}
            <MemoizedMoodTracker
              locked={isFree}
              initialData={initialMoodSummary}
            />
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
