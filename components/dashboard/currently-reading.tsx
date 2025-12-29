"use client";

import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { BookCard } from "@/components/ui/book/book-card";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { cn } from "@/lib/utils";

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
  onStatusChange?: (bookId: string, status: BookStatus, dates?: BookStatusDates) => void;
  onRemove?: (bookId: string) => void;
}

export function CurrentlyReading({
  books,
  onProgressUpdate,
  onStatusChange,
  onRemove,
}: CurrentlyReadingProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAllMobile, setShowAllMobile] = useState(false);

  const INITIAL_MOBILE_COUNT = 12;
  const visibleBooksMobile = showAllMobile
    ? books
    : books.slice(0, INITIAL_MOBILE_COUNT);
  const hasMoreBooks = books.length > INITIAL_MOBILE_COUNT;

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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            Add Book
          </Button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
      }
    >
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        )}
      >
        {/* Mobile: Grid Layout */}
        <div className="lg:hidden">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {visibleBooksMobile.map((book) => (
              <Link
                key={book.id}
                href={`/currently-reading/${book.id}`}
                className="flex flex-col"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md mb-2">
                  <Image
                    src={book.cover || "/placeholder.svg"}
                    alt={`${book.title} by ${book.author}`}
                    fill
                    sizes="(max-width: 640px) 33vw, 25vw"
                    className="object-cover"
                  />
                  {book.totalPages > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-background/50">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${Math.round(
                            (book.pagesRead / book.totalPages) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-0.5">
                  {book.title}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-1">
                  {book.author}
                </p>
              </Link>
            ))}
          </div>
          {hasMoreBooks && !showAllMobile && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllMobile(true)}
                className="rounded-xl"
              >
                Load More ({books.length - INITIAL_MOBILE_COUNT} more)
              </Button>
            </div>
          )}
        </div>

        {/* Desktop: Horizontal Scroll Layout */}
        <div className="hidden lg:block relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide items-stretch"
          >
            {books.map((book) => (
              <div
                key={book.id}
                data-book-card
                className="flex flex-col min-w-[22%]"
              >
                <BookCard
                  className="flex-1"
                  title={book.title}
                  author={book.author}
                  cover={book.cover}
                  pagesRead={book.pagesRead}
                  totalPages={book.totalPages}
                  editable
                  onProgressUpdate={(pages) =>
                    onProgressUpdate?.(book.id, pages)
                  }
                  onStatusChange={(status, dates) =>
                    onStatusChange?.(book.id, status, dates)
                  }
                  onRemove={() => onRemove?.(book.id)}
                  currentStatus="currently_reading"
                />

                <Link
                  href={`/currently-reading/${book.id}`}
                  className="mt-auto pt-3"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-32 text-xs rounded-xl text-white bg-primary hover:bg-primary/90"
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
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCards("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-background/90 border border-border shadow-md hover:bg-muted transition-colors flex"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
