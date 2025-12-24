/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import {
  BookMarked,
  BookOpen,
  BookX,
  Calendar,
  FileText,
  ListPlus,
  CheckCircle2,
  Pause,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import {
  addBookToReadingList,
  updateBookStatus,
} from "@/app/actions/book-actions";
import { Badge } from "@/components/ui/badge";
import { BookAction, BookActionMenu } from "@/components/ui/book/book-actions";
import { GenreTag } from "@/components/ui/book/genre-tag";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Book, ReadingStatus } from "@/types/database.types";

type MobileActionId = BookAction | "paused" | "finished";

const mobileActions: Array<{
  id: MobileActionId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = [
  {
    id: "to-read",
    icon: BookMarked,
    label: "Want to Read",
    color: "bg-primary text-primary-foreground",
  },
  {
    id: "currently-reading",
    icon: BookOpen,
    label: "Reading",
    color: "bg-accent text-accent-foreground",
  },
  {
    id: "up-next",
    icon: ListPlus,
    label: "Up Next",
    color: "bg-chart-4 text-foreground",
  },
  {
    id: "paused",
    icon: Pause,
    label: "Paused",
    color: "bg-chart-3 text-foreground",
  },
  {
    id: "finished",
    icon: CheckCircle2,
    label: "Finished",
    color: "bg-chart-2 text-foreground",
  },
  {
    id: "did-not-finish",
    icon: BookX,
    label: "DNF",
    color: "bg-muted text-muted-foreground",
  },
];

interface BookSearchResultCardProps {
  book: Book;
  userBookStatus?: ReadingStatus;
  onAction?: (action: BookAction, book: Book) => void;
  onStatusChange?: (bookId: string, newStatus: ReadingStatus) => void;
}

// Helper function to format reading status for display
function formatReadingStatus(status: ReadingStatus): {
  label: string;
  icon: typeof BookOpen;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  const statusMap: Record<
    ReadingStatus,
    {
      label: string;
      icon: typeof BookOpen;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    currently_reading: {
      label: "Reading",
      icon: BookOpen,
      variant: "default",
    },
    finished: {
      label: "Finished",
      icon: CheckCircle2,
      variant: "secondary",
    },
    paused: {
      label: "Paused",
      icon: Pause,
      variant: "outline",
    },
    dnf: {
      label: "Did Not Finish",
      icon: BookX,
      variant: "destructive",
    },
    want_to_read: {
      label: "Want to Read",
      icon: BookMarked,
      variant: "outline",
    },
    up_next: {
      label: "Up Next",
      icon: ListPlus,
      variant: "outline",
    },
  };

  return statusMap[status] || statusMap.want_to_read;
}

export function BookSearchResultCard({
  book,
  userBookStatus,
  onAction,
  onStatusChange,
}: BookSearchResultCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [finishedDate, setFinishedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [optimisticStatus, setOptimisticStatus] = useState<
    ReadingStatus | undefined
  >(userBookStatus);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync optimistic status with prop changes
  useEffect(() => {
    setOptimisticStatus(userBookStatus);
  }, [userBookStatus]);

  // Reset date picker when modal closes
  useEffect(() => {
    if (!showModal) {
      setShowDatePicker(false);
      setFinishedDate(new Date().toISOString().split("T")[0]);
    }
  }, [showModal]);

  const coverUrl =
    book.cover_url_large || book.cover_url_medium || book.cover_url_small;
  const authors = book.authors?.join(", ") || "Unknown Author";
  const showPlaceholder = !coverUrl || imageError;

  // Get first 3 genres/subjects
  const genres = book.subjects?.slice(0, 3) || [];

  // Use optimistic status if available, otherwise fall back to prop
  const currentStatus = optimisticStatus ?? userBookStatus;
  const isOwned = !!currentStatus;
  const statusInfo = currentStatus ? formatReadingStatus(currentStatus) : null;

  const handleAction = async (action: MobileActionId | BookAction) => {
    // Handle paused and finished
    if (action === "paused" || action === "finished") {
      // If book is not owned, we need to add it first, then update status
      if (!isOwned) {
        // First add the book to the library (we'll use "want_to_read" as initial status)
        const addResult = await addBookToReadingList(book.id, "to-read");

        if (addResult.success) {
          // Update optimistic status immediately
          setOptimisticStatus(action === "finished" ? "finished" : "paused");

          // For finished status, we need to provide a date
          // Since this is a quick action (not from modal), use today's date
          if (action === "finished") {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const result = await updateBookStatus(
              book.id,
              "finished",
              today.toISOString()
            );

            if (result.success) {
              // Notify parent component
              onStatusChange?.(book.id, "finished");
              // Dispatch events
              window.dispatchEvent(
                new CustomEvent("book-status-changed", {
                  detail: { bookId: book.id, newStatus: "finished" },
                })
              );
            } else {
              // Revert on error
              setOptimisticStatus(undefined);
            }
          } else {
            // For paused, just update status
            await handleStatusChange("paused");
          }
        }
      } else {
        // Book is already owned, just update status
        await handleStatusChange(action);
      }
      return;
    }
    // Handle other actions through the onAction callback
    onAction?.(action as BookAction, book);
  };

  const handleCardClick = () => {
    if (isOwned) {
      setShowModal(true);
    }
  };

  const handleStatusChange = async (
    newStatus: ReadingStatus,
    date?: string
  ) => {
    if (newStatus === "finished" && !date) {
      // Show date picker instead of immediately updating
      setShowDatePicker(true);
      return;
    }

    // Optimistically update local state
    setOptimisticStatus(newStatus);
    setShowModal(false);
    setShowDatePicker(false);

    // Notify parent component for optimistic update
    onStatusChange?.(book.id, newStatus);

    const result = await updateBookStatus(book.id, newStatus, date);
    if (result.success) {
      // Dispatch events to refresh UI components
      window.dispatchEvent(
        new CustomEvent("book-status-changed", {
          detail: { bookId: book.id, newStatus },
        })
      );
      // Also dispatch book-added event for currently-reading component
      window.dispatchEvent(
        new CustomEvent("book-added", {
          detail: {
            bookId: book.id,
            action:
              newStatus === "currently_reading"
                ? "currently-reading"
                : undefined,
          },
        })
      );
    } else {
      // Revert optimistic update on error
      setOptimisticStatus(userBookStatus);
    }
  };

  const handleDateConfirm = async () => {
    // Convert date string to ISO string (end of day in user's timezone)
    const date = new Date(finishedDate);
    date.setHours(23, 59, 59, 999);
    await handleStatusChange("finished", date.toISOString());
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const modalContent =
    showModal && isOwned && statusInfo && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted relative">
                    {showPlaceholder ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                    ) : (
                      <Image
                        src={coverUrl || "/placeholder.svg"}
                        alt={book.title}
                        fill
                        className="object-cover"
                        unoptimized={coverUrl?.includes("openlibrary.org")}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {book.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {authors}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Current Status
                  </p>
                  <Badge variant={statusInfo.variant} className="text-sm">
                    <statusInfo.icon className="w-4 h-4" />
                    {statusInfo.label}
                  </Badge>
                </div>

                {/* Date Picker for Finished Status */}
                {showDatePicker ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">
                        When did you finish reading?
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={finishedDate}
                        onChange={(e) => setFinishedDate(e.target.value)}
                        className={cn(
                          "w-full px-3 py-2 rounded-lg border border-border",
                          "bg-background text-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                          "transition-all"
                        )}
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleDateConfirm}
                          size="sm"
                          className="flex-1 rounded-xl"
                        >
                          Confirm
                        </Button>
                        <Button
                          onClick={handleDateCancel}
                          size="sm"
                          variant="outline"
                          className="flex-1 rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Change Status
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {currentStatus !== "currently_reading" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleStatusChange("currently_reading")
                          }
                          className="justify-start"
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Start Reading
                        </Button>
                      )}
                      {currentStatus !== "finished" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange("finished")}
                          className="justify-start"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark Finished
                        </Button>
                      )}
                      {currentStatus !== "paused" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange("paused")}
                          className="justify-start"
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      {currentStatus !== "want_to_read" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange("want_to_read")}
                          className="justify-start"
                        >
                          <BookMarked className="w-4 h-4 mr-2" />
                          Want to Read
                        </Button>
                      )}
                      {currentStatus !== "up_next" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange("up_next")}
                          className="justify-start"
                        >
                          <ListPlus className="w-4 h-4 mr-2" />
                          Up Next
                        </Button>
                      )}
                      {currentStatus !== "dnf" && (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange("dnf")}
                          className="justify-start"
                        >
                          <BookX className="w-4 h-4 mr-2" />
                          Did Not Finish
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {currentStatus === "currently_reading" && (
                  <Link href={`/currently-reading/${book.id}`}>
                    <Button
                      className="w-full"
                      onClick={() => setShowModal(false)}
                    >
                      View Reading Progress
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={cn(
          "group relative bg-card rounded-2xl border border-border transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
          isOwned && "cursor-pointer"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Inner content with overflow-hidden for rounded corners */}
        <div className="overflow-hidden rounded-2xl">
          <div className="flex gap-4 p-4 relative">
            {/* Book Cover - Fixed width for consistency */}
            <div className="relative flex-shrink-0 w-28 md:w-32">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-md bg-muted">
                {showPlaceholder ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="relative w-full h-full rounded-xl overflow-hidden">
                    <Image
                      src={coverUrl || "/placeholder.svg"}
                      alt={book.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 112px, 128px"
                      unoptimized={coverUrl?.includes("openlibrary.org")}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Book Details */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Title & Author */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-bold text-foreground line-clamp-2 leading-tight text-base md:text-lg flex-1">
                  {book.title}
                </h4>
                {isOwned && statusInfo && (
                  <Badge variant={statusInfo.variant} className="shrink-0">
                    <statusInfo.icon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                {authors}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                {book.publish_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{book.publish_date}</span>
                  </div>
                )}
                {book.page_count && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{book.page_count} pages</span>
                  </div>
                )}
              </div>

              {/* Genre Tags */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {genres.map((genre, index) => (
                    <GenreTag key={index} genre={genre} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Horizontal Action Buttons - Only show if not owned */}
          {!isOwned && (
            <div className="sm:hidden px-4 pb-3 pt-2 border-t border-border">
              <div className="grid grid-cols-3 gap-2">
                {mobileActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(action.id);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200",
                        action.color,
                        "active:scale-95"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium leading-tight text-center">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desktop: Radial Action Menu - Only show if not owned */}
          {!isOwned && (
            <div
              className={cn(
                "hidden sm:block absolute bottom-2 right-2 z-[100] transition-all duration-300",
                isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
              )}
              style={{ pointerEvents: isHovered ? "auto" : "none" }}
              onClick={(e) => e.stopPropagation()}
            >
              <BookActionMenu onAction={handleAction} />
            </div>
          )}
        </div>
      </div>
      {/* Contextual Modal for Owned Books */}
      {modalContent}
    </>
  );
}
