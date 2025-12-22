"use client";

import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";

import { BookCard } from "@/components/ui/book/book-card";
import type { BookStatus } from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  pagesRead: number;
  totalPages: number;
}

interface CurrentlyReadingProps {
  books: Book[];
  onProgressUpdate?: (bookId: string, pages: number) => void;
  onStatusChange?: (bookId: string, status: BookStatus) => void;
}

export function CurrentlyReading({
  books,
  onProgressUpdate,
  onStatusChange,
}: CurrentlyReadingProps) {
  return (
    <DashboardCard
      title="Currently Reading"
      description={`${books.length} book${
        books.length !== 1 ? "s" : ""
      } in progress`}
      icon={BookOpen}
      action={
        <Button variant="ghost" size="sm" className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" />
          Add Book
        </Button>
      }
    >
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
              onProgressUpdate={(pages) => onProgressUpdate?.(book.id, pages)}
              onStatusChange={(status) => onStatusChange?.(book.id, status)}
            />
            <Link href={`/currently-reading/${book.id}`} className="mt-2">
              <Button variant="outline" size="sm" className="w-full text-xs">
                See details
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
