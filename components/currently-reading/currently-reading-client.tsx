"use client";

import { ArrowLeft, Star, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import { getBookDetail } from "@/app/actions/book-detail";
import type { CurrentlyReadingPageData } from "@/app/actions/currently-reading-page";
import { createJournalEntry } from "@/app/actions/journal-actions";
import { getReadingAnalytics } from "@/app/actions/reading-analytics";
import { updateReadingFormat } from "@/app/actions/reading-format";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import { BookDetailCard } from "@/components/currently-reading/book-details";
import { PaceCalculator } from "@/components/currently-reading/pace-calculator";
import { SessionAnalytics } from "@/components/currently-reading/session-analytics";
import {
  BookProgressEditor,
  type BookStatus,
  type BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import type { BookFormat } from "@/components/ui/book/format-badge";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { MoodTag } from "@/components/ui/mood-tag";
import {
  JournalEntry,
  JournalEntryType,
  ReadingJournal,
} from "@/components/ui/reading-journal";
import { ReadingStreak } from "@/components/ui/reading-streak";
import { UpNextPreview } from "@/components/ui/up-next-preview";
import { cn } from "@/lib/utils";

interface CurrentlyReadingClientProps {
  initialData: CurrentlyReadingPageData;
  bookId: string;
}

export function CurrentlyReadingClient({
  initialData,
  bookId,
}: CurrentlyReadingClientProps) {
  const router = useRouter();

  // Initialize state from server-fetched data
  const [book, setBook] = useState({
    ...initialData.book,
    startDate: new Date(initialData.book.startDate),
    format: initialData.book.format as BookFormat,
  });
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(
    initialData.journalEntries.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
    }))
  );
  const [analytics, setAnalytics] = useState(initialData.analytics);
  const [velocityStats] = useState(initialData.velocityStats);
  const [upNextBooks] = useState(initialData.upNextBooks);
  const [isProgressEditorOpen, setIsProgressEditorOpen] = useState(false);

  const averagePagesPerDay = analytics.averagePagesPerDay || 0;
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

  const handleProgressUpdate = async (pages: number) => {
    // Optimistically update UI
    setBook((prev) => ({ ...prev, pagesRead: pages }));

    // Update in database
    const result = await updateReadingProgress(bookId, pages);
    if (!result.success) {
      console.error("Failed to update progress:", result.error);
      // Revert on error - refetch book data
      const bookResult = await getBookDetail(bookId);
      if (bookResult.success) {
        const bookData = bookResult.book;
        const progress = bookData.progress;
        setBook((prev) => ({
          ...prev,
          pagesRead: progress?.pages_read || 0,
        }));
      }
    } else {
      // Refresh analytics after progress update
      const analyticsResult = await getReadingAnalytics(bookId);
      if (analyticsResult.success) {
        setAnalytics({
          pagesReadToday: analyticsResult.pagesReadToday,
          dailyGoal: analyticsResult.dailyGoal,
          averagePagesPerDay: analyticsResult.averagePagesPerDay,
          weeklyData: analyticsResult.weeklyData,
          totalReadingTime: analyticsResult.totalReadingTime,
        });
      }
    }
    setIsProgressEditorOpen(false);
  };

  const handleRemove = async () => {
    const result = await removeBookFromReadingList(bookId, "currently-reading");
    if (result.success) {
      router.push("/");
    }
    setIsProgressEditorOpen(false);
  };

  const handleStatusChange = async (
    status: BookStatus,
    dates?: BookStatusDates
  ) => {
    const result = await updateBookStatus(bookId, status, dates);
    if (!result.success) {
      setIsProgressEditorOpen(false);
      return;
    }

    setIsProgressEditorOpen(false);

    if (status === "finished" || status === "paused" || status === "dnf") {
      setTimeout(() => {
        router.push("/");
      }, 500);
    }
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
          estimatedFinish={
            averagePagesPerDay > 0
              ? `${Math.ceil(pagesRemaining / averagePagesPerDay)} days`
              : "Start reading to see estimate"
          }
          onUpdateProgress={() => setIsProgressEditorOpen(true)}
          onFormatChange={async (format) => {
            const result = await updateReadingFormat(bookId, format);
            if (result.success) {
              setBook((prev) => ({ ...prev, format }));
            }
          }}
          className="mb-8"
        />

        {/* Community Stats */}
        {book.ratings_count !== null && book.ratings_count !== undefined && (
          <DashboardCard
            title="Community Stats"
            description="See what other readers think"
          >
            {book.ratings_count > 0 ? (
              <div className="space-y-4">
                {/* Aggregate Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-5 h-5",
                          i < Math.floor(book.aggregate_rating || 0)
                            ? "fill-primary text-primary"
                            : i < (book.aggregate_rating || 0)
                              ? "fill-primary/50 text-primary"
                              : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    {book.aggregate_rating?.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({book.ratings_count}{" "}
                    {book.ratings_count === 1 ? "rating" : "ratings"})
                  </span>
                </div>

                {/* Common Moods */}
                {book.common_moods && book.common_moods.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Common moods
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {book.common_moods.map((mood, i) => (
                        <MoodTag
                          key={mood}
                          mood={mood}
                          color={
                            i % 3 === 0
                              ? "coral"
                              : i % 3 === 1
                                ? "teal"
                                : "purple"
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Consensus */}
                {(book.global_pacing || book.global_difficulty) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Community consensus
                    </p>
                    <p className="text-sm text-foreground">
                      Most readers find this book:{" "}
                      <span className="font-medium">
                        {[book.global_pacing, book.global_difficulty]
                          .filter(Boolean)
                          .join(" & ")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Users className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p>
                  Be the first to rate and tag this book to help the community!
                </p>
              </div>
            )}
          </DashboardCard>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Session Analytics */}
            <DashboardCard
              title="Reading Analytics"
              description="Track your reading sessions"
            >
              <SessionAnalytics
                pagesReadToday={analytics.pagesReadToday}
                dailyGoal={analytics.dailyGoal}
                averagePagesPerDay={averagePagesPerDay}
                totalReadingTime={analytics.totalReadingTime}
                weeklyData={analytics.weeklyData}
              />
            </DashboardCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Reading Streak */}
            <DashboardCard title="Reading Streak">
              <ReadingStreak
                currentStreak={velocityStats.currentStreak}
                longestStreak={velocityStats.bestStreak}
                weekData={analytics.weeklyData.map((d) => ({
                  day: d.day.charAt(0),
                  active: d.pages > 0,
                }))}
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

            <PaceCalculator
              pagesRemaining={pagesRemaining}
              averagePagesPerDay={averagePagesPerDay}
              currentStreak={velocityStats.currentStreak}
            />

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
              onRemove={handleRemove}
              currentStatus="currently_reading"
              dateStarted={book.startDate.toISOString()}
              bookId={bookId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
