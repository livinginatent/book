"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/ui/dashboard-card";

import { SessionAnalytics } from "@/components/currently-reading/session-analytics";
import {
  QuickActions,
  type QuickActionType,
} from "@/components/currently-reading/quick-actions";
import { PaceCalculator } from "@/components/currently-reading/pace-calculator";
import {
  BookProgressEditor,
  type BookStatus,
} from "@/components/ui/book/book-progress-editor";
import { JournalEntry, JournalEntryType, ReadingJournal } from "@/components/ui/reading-journal";
import { BookDetailCard } from "@/components/currently-reading/book-details";
import { ReadingStreak } from "@/components/ui/reading-streak";
import { UpNextPreview } from "@/components/ui/up-next-preview";
import { getBookDetail } from "@/app/actions/book-detail";
import { getJournalEntries, createJournalEntry } from "@/app/actions/journal-actions";
import { getReadingAnalytics } from "@/app/actions/reading-analytics";
import { getUpNextBooks } from "@/app/actions/up-next";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { removeBookFromReadingList, addBookToReadingList } from "@/app/actions/book-actions";
import { updateReadingFormat } from "@/app/actions/reading-format";
import type { BookFormat } from "@/components/ui/book/format-badge";

export default function CurrentlyReadingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [book, setBook] = useState<{
    id: string;
    title: string;
    author: string;
    cover: string;
    totalPages: number;
    pagesRead: number;
    startDate: Date;
    format: BookFormat;
    series?: { name: string; number: number; total: number };
    moods: string[];
    pace: string;
  } | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [analytics, setAnalytics] = useState<{
    pagesReadToday: number;
    averagePagesPerDay: number;
    weeklyData: { day: string; pages: number }[];
    totalReadingTime: string;
  } | null>(null);
  const [upNextBooks, setUpNextBooks] = useState<Array<{
    id: string;
    title: string;
    author: string;
    cover: string;
  }>>([]);
  const [isProgressEditorOpen, setIsProgressEditorOpen] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    async function fetchData() {
      if (!bookId) {
        setError("Book ID is required");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch book detail
        const bookResult = await getBookDetail(bookId);
        if (!bookResult.success) {
          setError(bookResult.error);
          setLoading(false);
          return;
        }

        const bookData = bookResult.book;
        const progress = bookData.progress;
        const startDate = progress?.started_at
          ? new Date(progress.started_at)
          : new Date(bookData.userBook?.date_added || Date.now());

        setBook({
          id: bookData.id,
          title: bookData.title,
          author: bookData.authors?.join(", ") || "Unknown Author",
          cover:
            bookData.cover_url_medium ||
            bookData.cover_url_large ||
            bookData.cover_url_small ||
            "",
          totalPages: bookData.page_count || 0,
          pagesRead: progress?.pages_read || 0,
          startDate,
          format: (bookData.userBook?.reading_format as BookFormat) || "physical",
          moods: bookData.subjects?.slice(0, 3) || [],
          pace: "Medium-paced", // Can be calculated from analytics later
        });

        // Fetch journal entries
        const journalResult = await getJournalEntries(bookId);
        if (journalResult.success) {
          setJournalEntries(journalResult.entries);
        }

        // Fetch analytics
        const analyticsResult = await getReadingAnalytics(bookId);
        if (analyticsResult.success) {
          setAnalytics(analyticsResult);
        }

        // Fetch up-next books
        const upNextResult = await getUpNextBooks();
        if (upNextResult.success) {
          setUpNextBooks(upNextResult.books);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load book data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bookId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Book not found"}</p>
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            Go back to home
          </Link>
        </div>
      </div>
    );
  }

  const averagePagesPerDay = analytics?.averagePagesPerDay || 0;
  const pagesRemaining = book.totalPages - book.pagesRead;

  const handleAddJournalEntry = async (
    type: JournalEntryType,
    content: string,
    page?: number
  ) => {
    const result = await createJournalEntry(bookId, type, content, page);
    if (result.success) {
      setJournalEntries((prev) => [result.entry, ...prev]);
    } else {
      console.error("Failed to create journal entry:", result.error);
    }
  };

  const handleQuickAction = (action: QuickActionType) => {
    console.log("Quick action:", action);
    // TODO: Implement quick actions (e.g., mark as finished, add to favorites)
  };

  const handleProgressUpdate = async (pages: number) => {
    // Optimistically update UI
    setBook((prev) => (prev ? { ...prev, pagesRead: pages } : null));

    // Update in database
    const result = await updateReadingProgress(bookId, pages);
    if (!result.success) {
      console.error("Failed to update progress:", result.error);
      // Revert on error - refetch book data
      const bookResult = await getBookDetail(bookId);
      if (bookResult.success) {
        const bookData = bookResult.book;
        const progress = bookData.progress;
        setBook((prev) =>
          prev
            ? {
                ...prev,
                pagesRead: progress?.pages_read || 0,
              }
            : null
        );
      }
    } else {
      // Refresh analytics after progress update
      const analyticsResult = await getReadingAnalytics(bookId);
      if (analyticsResult.success) {
        setAnalytics(analyticsResult);
      }
    }
    setIsProgressEditorOpen(false);
  };

  const handleStatusChange = async (status: BookStatus) => {
    if (status === "remove") {
      // Remove from currently reading
      const result = await removeBookFromReadingList(bookId, "currently-reading");
      if (result.success) {
        router.push("/");
      } else {
        console.error("Failed to remove book:", result.error);
      }
    } else {
      // Handle other status changes
      const removeResult = await removeBookFromReadingList(bookId, "currently-reading");
      if (!removeResult.success) {
        console.error("Failed to remove book from currently reading:", removeResult.error);
        return;
      }

      const statusToAction: Record<BookStatus, "up-next" | "did-not-finish" | null> = {
        finished: null,
        paused: "up-next",
        "did-not-finish": "did-not-finish",
        reading: null,
        remove: null,
      };

      const action = statusToAction[status];
      if (action) {
        await addBookToReadingList(bookId, action);
      }

      router.push("/");
    }
    setIsProgressEditorOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-foreground">Currently Reading</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Book Detail Card */}
        <BookDetailCard
          book={book}
          estimatedFinish={`${Math.ceil(
            pagesRemaining / averagePagesPerDay
          )} days`}
          onUpdateProgress={() => setIsProgressEditorOpen(true)}
          onFormatChange={async (format) => {
            const result = await updateReadingFormat(bookId, format);
            if (result.success) {
              setBook((prev) => (prev ? { ...prev, format } : null));
            }
          }}
          className="mb-8"
        />

        {/* Quick Actions */}
        <DashboardCard title="Quick Actions" className="mb-6">
          <QuickActions onAction={handleQuickAction} />
        </DashboardCard>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Session Analytics */}
            <DashboardCard
              title="Reading Analytics"
              description="Track your reading sessions"
            >
              <SessionAnalytics
                pagesReadToday={analytics?.pagesReadToday || 0}
                dailyGoal={40}
                averagePagesPerDay={averagePagesPerDay}
                totalReadingTime={analytics?.totalReadingTime || "0h 0m"}
                weeklyData={
                  analytics?.weeklyData || [
                    { day: "Mon", pages: 0 },
                    { day: "Tue", pages: 0 },
                    { day: "Wed", pages: 0 },
                    { day: "Thu", pages: 0 },
                    { day: "Fri", pages: 0 },
                    { day: "Sat", pages: 0 },
                    { day: "Sun", pages: 0 },
                  ]
                }
              />
            </DashboardCard>

            {/* Pace Calculator */}
            <PaceCalculator
              pagesRemaining={pagesRemaining}
              averagePagesPerDay={averagePagesPerDay}
              currentStreak={6}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Reading Streak */}
            <DashboardCard title="Reading Streak">
              <ReadingStreak
                currentStreak={6}
                longestStreak={14}
                weekData={[
                  { day: "M", active: (analytics?.pagesReadToday || 0) > 0 },
                  { day: "T", active: false },
                  { day: "W", active: false },
                  { day: "T", active: false },
                  { day: "F", active: false },
                  { day: "S", active: false },
                  { day: "S", active: false },
                ]}
              />
            </DashboardCard>

            {/* Reading Journal */}
            <DashboardCard
              title="Reading Journal"
              description="Notes, quotes & predictions"
            >
              <ReadingJournal
                entries={journalEntries}
                onAddEntry={handleAddJournalEntry}
              />
            </DashboardCard>

            {/* Up Next */}
            <UpNextPreview books={upNextBooks} />
          </div>
        </div>
      </main>

      {/* Progress Editor Modal */}
      {isProgressEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm">
          <div className="relative w-72 bg-card rounded-2xl shadow-2xl overflow-hidden">
            <BookProgressEditor
              currentPages={book.pagesRead}
              totalPages={book.totalPages}
              isOpen={true}
              onClose={() => setIsProgressEditorOpen(false)}
              onSave={handleProgressUpdate}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
