"use client";

import { BookCard } from "../ui/book/book-card";
import { BookStatus } from "../ui/book/book-progress-editor";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
  lastReadDate?: Date | null;
  date_added?: string;
}

interface ShelfBookGridProps {
  books: Book[];
  sortBy?: "progress" | "added" | "title" | "neglected";
  onProgressUpdate?: (bookId: string, pages: number) => void;
  onStatusChange?: (bookId: string, status: BookStatus) => void;
}

export function ShelfBookGrid({
  books,
  sortBy = "progress",
  onProgressUpdate,
  onStatusChange,
}: ShelfBookGridProps) {
  // Helper function to check if a book is neglected (> 3 days since last read)
  const isNeglected = (book: Book): boolean => {
    if (!book.lastReadDate) return true; // Never read
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const lastRead = new Date(book.lastReadDate);
      if (isNaN(lastRead.getTime())) return true; // Invalid date
      return lastRead < threeDaysAgo;
    } catch {
      return true; // Error parsing date
    }
  };

  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === "progress") {
      const progressA = a.totalPages > 0 ? a.pagesRead / a.totalPages : 0;
      const progressB = b.totalPages > 0 ? b.pagesRead / b.totalPages : 0;
      return progressB - progressA; // Descending
    } else if (sortBy === "neglected") {
      // Sort by lastReadDate ascending (oldest first)
      const dateA = a.lastReadDate ? new Date(a.lastReadDate).getTime() : 0;
      const dateB = b.lastReadDate ? new Date(b.lastReadDate).getTime() : 0;
      return dateA - dateB; // Ascending (oldest first)
    } else if (sortBy === "added") {
      // Sort by date_added descending (newest first)
      const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
      const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
      return dateB - dateA; // Descending (newest first)
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  if (books.length === 0) {
    return (
      <div className="col-span-full py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
          <span className="text-2xl">📚</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No books here yet
        </h3>
        <p className="text-muted-foreground">
          Start reading to build your shelf!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {sortedBooks.map((book) => (
        <BookCard
          key={book.id}
          title={book.title}
          author={book.author}
          cover={book.cover}
          pagesRead={book.pagesRead}
          totalPages={book.totalPages}
          editable
          isNeglected={isNeglected(book)}
          onProgressUpdate={(pages) => onProgressUpdate?.(book.id, pages)}
          onStatusChange={(status) => onStatusChange?.(book.id, status)}
        />
      ))}
    </div>
  );
}
