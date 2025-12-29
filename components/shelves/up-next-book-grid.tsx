"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Calendar,
  Play,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadingStatus } from "@/types/database.types";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
  date_added?: string;
  status?: ReadingStatus;
}

interface UpNextBookGridProps {
  books: Book[];
  dailyReadingGoal: number;
  onStartReading: (bookId: string) => Promise<void>;
  onReorder: (bookIds: string[]) => Promise<void>;
  onRemove?: (bookId: string) => void;
}

interface SortableBookRowProps {
  book: Book;
  rank: number;
  estimatedStartDate: Date | null;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isMobile: boolean;
}

function SortableBookRow({
  book,
  rank,
  estimatedStartDate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isMobile,
}: SortableBookRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id, disabled: isMobile });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Today";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 7 && diffDays > -7) {
      return diffDays > 0
        ? `In ${diffDays} days`
        : `${Math.abs(diffDays)} days ago`;
    }

    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        targetDate.getFullYear() !== today.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors",
        isDragging && "shadow-lg"
      )}
    >
      {/* Desktop: Drag Handle */}
      <div
        {...attributes}
        {...(!isMobile ? listeners : {})}
        className={cn(
          "hidden md:block cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors",
          isMobile && "cursor-default"
        )}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Mobile: Up/Down Buttons */}
      {isMobile && (
        <div className="flex flex-col gap-1 md:hidden">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp?.();
            }}
            disabled={!canMoveUp}
            className={cn(
              "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              !canMoveUp && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown?.();
            }}
            disabled={!canMoveDown}
            className={cn(
              "p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
              !canMoveDown && "opacity-30 cursor-not-allowed"
            )}
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-12 h-12 rounded-md bg-muted flex items-center justify-center font-bold text-lg">
          #{rank}
        </div>

        <div className="relative w-16 h-24 rounded-md overflow-hidden flex-shrink-0">
          <Image
            src={book.cover || "/placeholder.svg"}
            alt={`Cover for ${book.title}`}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {book.author}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Est. Start: {formatDate(estimatedStartDate)}
            </span>
          </div>
        </div>

        <div className="text-sm text-muted-foreground flex-shrink-0">
          {book.totalPages} pages
        </div>
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex-shrink-0 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Remove book from queue"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

interface HeroCardProps {
  book: Book;
  estimatedStartDate: Date | null;
  onStartReading: () => Promise<void>;
  onRemove?: () => void;
  isDragging?: boolean;
  onMoveDown?: () => void;
  canMoveDown: boolean;
  isMobile: boolean;
}

function HeroCard({
  book,
  estimatedStartDate,
  onStartReading,
  onRemove,
  isDragging = false,
  onMoveDown,
  canMoveDown,
  isMobile,
}: HeroCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "Today";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 7 && diffDays > -7) {
      return diffDays > 0
        ? `In ${diffDays} days`
        : `${Math.abs(diffDays)} days ago`;
    }

    return targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        targetDate.getFullYear() !== today.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-primary/5 via-card to-card shadow-lg transition-opacity",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex flex-col md:flex-row gap-6 p-6 md:p-8">
        {/* Cover Image */}
        <div className="relative w-32 h-48 md:w-48 md:h-80 rounded-xl overflow-hidden shadow-xl flex-shrink-0 mx-auto md:mx-0 bg-muted">
          <Image
            src={book.cover || "/placeholder.svg"}
            alt={`Cover for ${book.title}`}
            fill
            sizes="(max-width: 768px) 128px, 192px"
            className="object-contain"
            priority
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <span>#1</span>
              <span>Next Up</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              {book.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">{book.author}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Est. Start: {formatDate(estimatedStartDate)}</span>
              </div>
              <span>•</span>
              <span>{book.totalPages} pages</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <Button
              onClick={onStartReading}
              size="lg"
              className="flex-1 md:flex-initial min-w-[200px] gap-2"
            >
              <Play className="w-5 h-5" />
              Start Reading Now
            </Button>
            {isMobile && onMoveDown && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={!canMoveDown}
                variant="outline"
                size="lg"
                className="gap-2"
                aria-label="Move down in queue"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Move Down</span>
              </Button>
            )}
            {onRemove && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                variant="outline"
                size="lg"
                className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpNextBookGrid({
  books,
  dailyReadingGoal,
  onStartReading,
  onReorder,
  onRemove,
}: UpNextBookGridProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate estimated start dates for each book
  const booksWithDates = useMemo(() => {
    if (books.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return books.map((book, index) => {
      // Sum pages of all books above this one (lower index = higher priority)
      const pagesAbove = books
        .slice(0, index)
        .reduce((sum, b) => sum + (b.totalPages || 0), 0);

      // Calculate days offset
      const daysOffset =
        dailyReadingGoal > 0 && pagesAbove > 0
          ? Math.ceil(pagesAbove / dailyReadingGoal)
          : 0;

      // Calculate estimated start date
      const estimatedDate = new Date(today);
      estimatedDate.setDate(estimatedDate.getDate() + daysOffset);

      return {
        book,
        estimatedStartDate: estimatedDate,
      };
    });
  }, [books, dailyReadingGoal]);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isMobile) return; // Disable drag on mobile

    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = books.findIndex((b) => b.id === active.id);
    const newIndex = books.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Allow reordering all books, including swapping with #1
    const reorderedBooks = arrayMove(books, oldIndex, newIndex);
    const bookIds = reorderedBooks.map((b) => b.id);

    // Update order in database
    await onReorder(bookIds);
  };

  const handleMoveUp = async (bookId: string) => {
    const currentIndex = books.findIndex((b) => b.id === bookId);
    if (currentIndex <= 0) return; // Can't move up if already at top

    const newIndex = currentIndex - 1;
    const reorderedBooks = arrayMove(books, currentIndex, newIndex);
    const bookIds = reorderedBooks.map((b) => b.id);
    await onReorder(bookIds);
  };

  const handleMoveDown = async (bookId: string) => {
    const currentIndex = books.findIndex((b) => b.id === bookId);
    if (currentIndex < 0 || currentIndex >= books.length - 1) return; // Can't move down if already at bottom

    const newIndex = currentIndex + 1;
    const reorderedBooks = arrayMove(books, currentIndex, newIndex);
    const bookIds = reorderedBooks.map((b) => b.id);
    await onReorder(bookIds);
  };

  if (books.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No books in your queue yet.</p>
      </div>
    );
  }

  const heroBook = books[0];
  const remainingBooks = books.slice(1);
  const heroBookData = booksWithDates[0];

  // Create a droppable zone for the hero card
  function HeroDropZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
      id: "hero-drop-zone",
    });

    return (
      <div
        ref={setNodeRef}
        className={cn(
          "transition-all",
          isOver && "ring-2 ring-primary ring-offset-2 rounded-2xl"
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <DndContext
      sensors={isMobile ? [] : sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={books.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {/* Hero Card for #1 Book */}
          {heroBook && heroBookData && (
            <HeroDropZone>
              <SortableHeroCardWrapper bookId={heroBook.id} isMobile={isMobile}>
                <HeroCard
                  book={heroBook}
                  estimatedStartDate={heroBookData.estimatedStartDate}
                  onStartReading={() => onStartReading(heroBook.id)}
                  onRemove={onRemove ? () => onRemove(heroBook.id) : undefined}
                  onMoveDown={
                    remainingBooks.length > 0
                      ? () => handleMoveDown(heroBook.id)
                      : undefined
                  }
                  canMoveDown={remainingBooks.length > 0}
                  isMobile={isMobile}
                />
              </SortableHeroCardWrapper>
            </HeroDropZone>
          )}

          {/* Sortable List for Remaining Books */}
          {remainingBooks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming Books
              </h3>
              <h4 className="text-sm text-muted-foreground">
                {isMobile
                  ? "Use the up/down buttons to reorder your books."
                  : "Drag and drop to reorder your books."}
              </h4>
              <div className="space-y-2">
                {remainingBooks.map((book, index) => {
                  const bookData = booksWithDates[index + 1];
                  const actualIndex = index + 1; // +1 because hero is at index 0
                  return (
                    <SortableBookRow
                      key={book.id}
                      book={book}
                      rank={index + 2}
                      estimatedStartDate={bookData?.estimatedStartDate || null}
                      onRemove={onRemove ? () => onRemove(book.id) : undefined}
                      onMoveUp={() => handleMoveUp(book.id)}
                      onMoveDown={() => handleMoveDown(book.id)}
                      canMoveUp={actualIndex > 0}
                      canMoveDown={actualIndex < books.length - 1}
                      isMobile={isMobile}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// Wrapper to make hero card sortable
function SortableHeroCardWrapper({
  bookId,
  children,
  isMobile,
}: {
  bookId: string;
  children: React.ReactNode;
  isMobile: boolean;
}) {
  const { setNodeRef, transform, transition } = useSortable({
    id: bookId,
    disabled: isMobile,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}
