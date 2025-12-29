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
import { GripVertical, Calendar, Play, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
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
}

function SortableBookRow({
  book,
  rank,
  estimatedStartDate,
  onRemove,
}: SortableBookRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

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
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>

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
}

function HeroCard({
  book,
  estimatedStartDate,
  onStartReading,
  onRemove,
  isDragging = false,
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
        <div className="relative w-full md:w-48 h-72 md:h-80 rounded-xl overflow-hidden shadow-xl flex-shrink-0">
          <Image
            src={book.cover || "/placeholder.svg"}
            alt={`Cover for ${book.title}`}
            fill
            sizes="(max-width: 768px) 100vw, 192px"
            className="object-cover"
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

          <div className="mt-6 flex items-center gap-3">
            <Button
              onClick={onStartReading}
              size="lg"
              className="flex-1 md:flex-initial min-w-[200px] gap-2"
            >
              <Play className="w-5 h-5" />
              Start Reading Now
            </Button>
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
  const sensors = useSensors(
    useSensor(PointerSensor),
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
      sensors={sensors}
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
              <SortableHeroCardWrapper bookId={heroBook.id}>
                <HeroCard
                  book={heroBook}
                  estimatedStartDate={heroBookData.estimatedStartDate}
                  onStartReading={() => onStartReading(heroBook.id)}
                  onRemove={onRemove ? () => onRemove(heroBook.id) : undefined}
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
                Drag and drop to reorder your books.
              </h4>
              <div className="space-y-2">
                {remainingBooks.map((book, index) => {
                  const bookData = booksWithDates[index + 1];
                  return (
                    <SortableBookRow
                      key={book.id}
                      book={book}
                      rank={index + 2}
                      estimatedStartDate={bookData?.estimatedStartDate || null}
                      onRemove={onRemove ? () => onRemove(book.id) : undefined}
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
}: {
  bookId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, transform, transition } = useSortable({
    id: bookId,
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
