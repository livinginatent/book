"use client";

import { BookOpen, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollByCards = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const firstChild =
      container.querySelector<HTMLDivElement>("[data-book-card]");
    const cardWidth = firstChild?.clientWidth ?? 0;
    const gap = 16;
    const amount = (cardWidth + gap) * 2;

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

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
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide items-stretch"
        >
          {books.map((book) => (
            <div
              key={book.id}
              data-book-card
              /* 1. Changed: Added 'flex flex-col' to the wrapper 
                 2. Added 'min-h-full' to ensure cards match height if parent allows 
              */
              className="flex flex-col min-w-[70%] sm:min-w-[45%] lg:min-w-[22%] "
            >
              <BookCard
                /* 3. Added 'flex-1': This forces the BookCard to grow and 
                      fill all available space, pushing the Link below it.
                */
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

              {/* 4. 'mt-auto' ensures this stays at the very bottom of the flex column */}
              <Link
                href={`/currently-reading/${book.id}`}
                className="mt-auto pt-3"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs rounded-xl text-white bg-primary hover:bg-primary/90"
                >
                  See details
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {books.length > 4 && (
          <>
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards("right")}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </DashboardCard>
  );
}
