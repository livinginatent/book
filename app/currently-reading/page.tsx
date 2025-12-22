"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BookCard } from "@/components/ui/book/book-card";
import { getCurrentlyReadingBooks } from "@/app/actions/currently-reading";
import type { BookStatus } from "@/components/ui/book/book-progress-editor";
import { updateReadingProgress } from "@/app/actions/reading-progress";
import type { ReadingStatus } from "@/types/database.types";
import {
  removeBookFromReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";

interface CurrentlyReadingBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
}

export default function CurrentlyReadingListPage() {
  const [books, setBooks] = useState<CurrentlyReadingBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooks() {
      const result = await getCurrentlyReadingBooks();
      if (result.success) {
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
        setBooks(transformedBooks);
      }
      setLoading(false);
    }

    fetchBooks();
  }, []);

  const handleProgressUpdate = async (bookId: string, pages: number) => {
    // Optimistically update UI
    setBooks((prev) =>
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
        const transformedBooks: CurrentlyReadingBook[] = fetchResult.books.map(
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
        setBooks(transformedBooks);
      }
    }
  };

  const handleStatusChange = async (bookId: string, status: BookStatus, date?: string) => {
    if (status === "remove") {
      // Remove from UI optimistically
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

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
          setBooks(transformedBooks);
        }
      }
    } else {
      // Map BookStatus to ReadingStatus
      const statusMap: Record<BookStatus, ReadingStatus | null> = {
        finished: "finished",
        paused: "paused",
        "did-not-finish": "dnf",
        reading: "currently_reading",
        remove: null,
      };

      const readingStatus = statusMap[status];
      if (!readingStatus) {
        return;
      }

      // Update the book status using updateBookStatus with optional date
      const result = await updateBookStatus(bookId, readingStatus, date);
      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert on error - refetch books
        const fetchResult = await getCurrentlyReadingBooks();
        if (fetchResult.success) {
          const transformedBooks: CurrentlyReadingBook[] = fetchResult.books.map(
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
          setBooks(transformedBooks);
        }
        return;
      }

      // Remove from UI since it's no longer "currently reading"
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-foreground">Currently Reading</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <DashboardCard
          title="Currently Reading"
          description={`${books.length} book${
            books.length !== 1 ? "s" : ""
          } in progress`}
          icon={BookOpen}
        >
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading books...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You don&apos;t have any books in progress yet.
              </p>
              <Link href="/" className="text-primary hover:underline">
                Go back to home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map((book) => (
                <div key={book.id} className="flex flex-col h-full">
                  <BookCard
                    className="flex-1"
                    title={book.title}
                    author={book.author}
                    cover={book.cover}
                    pagesRead={book.pagesRead}
                    totalPages={book.totalPages}
                    editable
                    onProgressUpdate={(pages) =>
                      handleProgressUpdate(book.id, pages)
                    }
                    onStatusChange={(status) =>
                      handleStatusChange(book.id, status)
                    }
                  />
                  <Link href={`/currently-reading/${book.id}`} className="mt-2">
                    <button className="w-full text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
                      See details
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </DashboardCard>
      </main>
    </div>
  );
}
