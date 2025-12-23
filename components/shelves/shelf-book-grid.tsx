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
}

interface ShelfBookGridProps {
  books: Book[];
  sortBy?: "progress" | "added" | "title";
  onProgressUpdate?: (bookId: string, pages: number) => void;
  onStatusChange?: (bookId: string, status: BookStatus) => void;
}

export function ShelfBookGrid({
  books,
  sortBy = "progress",
  onProgressUpdate,
  onStatusChange,
}: ShelfBookGridProps) {
  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === "progress") {
      const progressA = a.pagesRead / a.totalPages;
      const progressB = b.pagesRead / b.totalPages;
      return progressB - progressA;
    } else if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0; // "added" - maintain original order
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
          onProgressUpdate={(pages) => onProgressUpdate?.(book.id, pages)}
          onStatusChange={(status) => onStatusChange?.(book.id, status)}
        />
      ))}
    </div>
  );
}
