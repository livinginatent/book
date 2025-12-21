"use client";

import { useState } from "react";
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
} from "@/components/ui/book-progress-editor";
import { JournalEntry, JournalEntryType, ReadingJournal } from "@/components/ui/reading-journal";
import { BookDetailCard } from "@/components/currently-reading/book-details";
import { ReadingStreak } from "@/components/ui/reading-streak";
import { UpNextPreview } from "@/components/ui/up-next-preview";

// Mock data
const mockBook = {
  id: "1",
  title: "The House in the Cerulean Sea",
  author: "TJ Klune",
  cover: "/fantasy-book-cover-cerulean-sea.jpg",
  totalPages: 394,
  pagesRead: 268,
  startDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  format: "physical" as const,
  series: { name: "Cerulean Chronicles", number: 1, total: 2 },
  moods: ["Heartwarming", "Cozy", "Found Family"],
  pace: "Medium-paced",
};

const mockJournalEntries: JournalEntry[] = [
  {
    id: "1",
    type: "quote",
    content: "Don't you wish you were free?",
    page: 142,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: "2",
    type: "note",
    content:
      "I love how the children each have such unique personalities. Lucy is my favorite so far!",
    page: 98,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "3",
    type: "prediction",
    content: "I think Linus will end up staying on the island permanently.",
    page: 200,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const mockWeeklyData = [
  { day: "Mon", pages: 35 },
  { day: "Tue", pages: 42 },
  { day: "Wed", pages: 28 },
  { day: "Thu", pages: 55 },
  { day: "Fri", pages: 20 },
  { day: "Sat", pages: 48 },
  { day: "Sun", pages: 32 },
];

const mockStreakData = [
  { day: "M", active: true },
  { day: "T", active: true },
  { day: "W", active: true },
  { day: "T", active: true },
  { day: "F", active: false },
  { day: "S", active: true },
  { day: "S", active: true },
];

const mockUpNext = [
  {
    id: "1",
    title: "Project Hail Mary",
    author: "Andy Weir",
    cover: "/sci-fi-book-cover-project-hail-mary.jpg",
  },
  {
    id: "2",
    title: "Babel",
    author: "R.F. Kuang",
    cover: "/dark-academia-book-cover-babel.jpg",
  },
  {
    id: "3",
    title: "Piranesi",
    author: "Susanna Clarke",
    cover: "/surreal-fantasy-book-cover-piranesi.jpg",
  },
];

export default function CurrentlyReadingDetailPage() {
  const [book, setBook] = useState(mockBook);
  const [journalEntries, setJournalEntries] = useState(mockJournalEntries);
  const [isProgressEditorOpen, setIsProgressEditorOpen] = useState(false);

  const averagePagesPerDay = 37;
  const pagesRemaining = book.totalPages - book.pagesRead;

  const handleAddJournalEntry = (
    type: JournalEntryType,
    content: string,
    page?: number
  ) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      type,
      content,
      page,
      createdAt: new Date(),
    };
    setJournalEntries((prev) => [newEntry, ...prev]);
  };

  const handleQuickAction = (action: QuickActionType) => {
    console.log("Quick action:", action);
    // TODO: Implement quick actions
  };

  const handleProgressUpdate = (pages: number) => {
    setBook((prev) => ({ ...prev, pagesRead: pages }));
    setIsProgressEditorOpen(false);
  };

  const handleStatusChange = (status: BookStatus) => {
    console.log("Status changed:", status);
    // TODO: Implement status change
    setIsProgressEditorOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/authenticated-home"
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
                pagesReadToday={32}
                dailyGoal={40}
                averagePagesPerDay={averagePagesPerDay}
                totalReadingTime="8h 24m"
                weeklyData={mockWeeklyData}
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
                weekData={mockStreakData}
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
            <UpNextPreview books={mockUpNext} />
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
