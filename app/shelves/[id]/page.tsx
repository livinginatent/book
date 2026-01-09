"use client";

import {
  ArrowLeft,
  Search,
  Grid3x3,
  List,
  MoreVertical,
  Loader2,
  Edit,
  Trash2,
  BookMarked,
  X,
  BookOpen,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  removeBookFromReadingList,
  updateBookStatus,
  addBookToReadingList,
  getUserBookStatuses,
} from "@/app/actions/book-actions";
import { searchBooks } from "@/app/actions/books";
import { updateBookReview } from "@/app/actions/reviews";
import {
  getShelfWithBooks,
  getShelfBooks,
  addBookToShelf,
  getUserBookId,
} from "@/app/actions/shelf-actions";
import { BookSearchResultCard } from "@/components/search/book-search-result-card";
import { ShelfBookGrid } from "@/components/shelves/shelf-book-grid";
import { Badge } from "@/components/ui/badge";
import type { BookAction } from "@/components/ui/book/book-actions";
import type {
  BookStatus,
  BookStatusDates,
} from "@/components/ui/book/book-progress-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShelfLoading } from "@/hooks/use-shelf-loading";
import type { Book, ReadingStatus } from "@/types/database.types";

interface ShelfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  totalPages: number;
  pagesRead: number;
  rating?: number | null;
  status?: ReadingStatus;
  date_added?: string;
  dateFinished?: string | null;
}

type SortOption =
  | "progress"
  | "added"
  | "title"
  | "neglected"
  | "oldest"
  | "newest"
  | "shortest";

type ViewMode = "grid" | "list";

// Helper function to format status labels
function formatStatusLabel(status: ReadingStatus): string {
  const statusMap: Record<ReadingStatus, string> = {
    want_to_read: "Want to Read",
    currently_reading: "Currently Reading",
    up_next: "Up Next",
    dnf: "Did Not Finish",
    paused: "Paused",
    finished: "Finished",
  };
  return statusMap[status] || status;
}

export default function ShelfDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shelfId = params.id as string;
  const { withLoading } = useShelfLoading();

  const [shelf, setShelf] = useState<{
    id: string;
    name: string;
    type: "default" | "custom";
    book_count: number;
  } | null>(null);
  const [books, setBooks] = useState<ShelfBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [isSearching, startSearchTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [userBookStatuses, setUserBookStatuses] = useState<
    Record<string, ReadingStatus>
  >({});
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch shelf and books - single optimized call
  useEffect(() => {
    let isMounted = true;

    async function fetchShelfData() {
      setLoading(true);
      const result = await getShelfWithBooks(shelfId);

      if (!isMounted) return;

      if (result.success) {
        setShelf(result.shelf);
        setBooks(result.books);
      } else {
        console.error("Failed to load shelf:", result.error);
        router.push("/");
        return;
      }

      setLoading(false);
    }

    fetchShelfData();

    return () => {
      isMounted = false;
    };
  }, [shelfId, router]);

  // Debounced book search
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    const MIN_QUERY_LENGTH = 3;

    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) {
      // Use setTimeout to avoid setState in effect
      if (trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH) {
        setTimeout(
          () =>
            setSearchError(
              `Please enter at least ${MIN_QUERY_LENGTH} characters`
            ),
          0
        );
      } else {
        setTimeout(() => setSearchError(null), 0);
      }

      if (hasSearched) {
        setTimeout(() => {
          setSearchResults([]);
          setSearchTotal(0);
          setHasSearched(false);
          setUserBookStatuses({});
        }, 0);
      }
      return;
    }

    setTimeout(() => setSearchError(null), 0);

    searchDebounceRef.current = setTimeout(() => {
      setHasSearched(true);
      startSearchTransition(async () => {
        const result = await searchBooks(trimmedQuery, 10, 0);

        if (result.success) {
          setSearchResults(result.books);
          setSearchTotal(result.total);

          // Fetch user book statuses
          if (result.books.length > 0) {
            const bookIds = result.books.map((b) => b.id);
            const statusesResult = await getUserBookStatuses(bookIds);
            if (statusesResult && !("success" in statusesResult)) {
              setUserBookStatuses(statusesResult);
            } else {
              setUserBookStatuses({});
            }
          } else {
            setUserBookStatuses({});
          }
        } else {
          setSearchError(result.error);
          setSearchResults([]);
          setSearchTotal(0);
          setUserBookStatuses({});
        }
      });
    }, 500);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, hasSearched]);

  // Filter and sort books (only for existing shelf books, not search results)
  const filteredBooks = useMemo(() => {
    const filtered = [...books];

    // Don't filter by searchQuery if we're showing search results
    // The search query is for finding new books to add

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "progress") {
        const progressA = a.totalPages > 0 ? a.pagesRead / a.totalPages : 0;
        const progressB = b.totalPages > 0 ? b.pagesRead / b.totalPages : 0;
        return progressB - progressA;
      } else if (sortBy === "added") {
        const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
        const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "oldest") {
        const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
        const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "newest") {
        const dateA = a.date_added ? new Date(a.date_added).getTime() : 0;
        const dateB = b.date_added ? new Date(b.date_added).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "shortest") {
        return (a.totalPages || 0) - (b.totalPages || 0);
      } else if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return filtered;
  }, [books, sortBy]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return books.reduce((sum, book) => sum + (book.totalPages || 0), 0);
  }, [books]);

  const handleRemove = useCallback(
    async (bookId: string, currentStatus: ReadingStatus) => {
      setBooks((prev) => prev.filter((book) => book.id !== bookId));

      // Map ReadingStatus to BookAction
      const statusToAction: Record<ReadingStatus, string> = {
        want_to_read: "want-to-read",
        currently_reading: "currently-reading",
        up_next: "up-next",
        dnf: "did-not-finish",
        paused: "paused",
        finished: "finished",
      };

      const result = await removeBookFromReadingList(
        bookId,
        statusToAction[currentStatus] as BookAction
      );

      if (!result.success) {
        console.error("Failed to remove book:", result.error);
        // Revert by refetching
        const booksResult = await getShelfBooks(shelfId);
        if (booksResult.success) {
          setBooks(booksResult.books);
        }
      }
    },
    [shelfId]
  );

  const handleStatusChange = useCallback(
    async (bookId: string, status: BookStatus, dates?: BookStatusDates) => {
      const result = await updateBookStatus(bookId, status, dates);

      if (!result.success) {
        console.error("Failed to update book status:", result.error);
        // Revert by refetching
        const booksResult = await getShelfBooks(shelfId);
        if (booksResult.success) {
          setBooks(booksResult.books);
        }
        return;
      }

      // Remove from UI when status changes
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    },
    [shelfId]
  );

  const handleRatingUpdate = useCallback(
    async (bookId: string, rating: number) => {
      // Optimistic update
      setBooks((prev) =>
        prev.map((book) => (book.id === bookId ? { ...book, rating } : book))
      );

      const result = await withLoading(
        () => updateBookReview(bookId, rating, {}),
        "Saving rating..."
      );

      if (!result.success) {
        console.error("Failed to update rating:", result.error);
        const booksResult = await getShelfBooks(shelfId);
        if (booksResult.success) {
          setBooks(booksResult.books);
        }
      }
    },
    [shelfId, withLoading]
  );

  // Handle adding book to shelf from search
  const handleAddBookToShelfOnly = useCallback(
    async (bookId: string) => {
      if (!shelf || shelf.type !== "custom") {
        return false;
      }

      return withLoading(async () => {
        const userBookIdResult = await getUserBookId(bookId);

        if (!userBookIdResult.success) {
          console.error("Failed to get user book ID:", userBookIdResult.error);
          return false;
        }

        const shelfResult = await addBookToShelf(
          shelf.id,
          userBookIdResult.userBookId
        );

        if (shelfResult.success) {
          const booksResult = await getShelfBooks(shelfId);
          if (booksResult.success) {
            setBooks(booksResult.books);
          }
          return true;
        }

        if (shelfResult.error?.includes("already in this shelf")) {
          return true;
        }
        console.error("Failed to add book to shelf:", shelfResult.error);
        return false;
      }, "Adding to shelf...");
    },
    [shelf, shelfId, withLoading]
  );

  const handleSearchBookAction = useCallback(
    async (action: string, book: Book) => {
      // First, add the book to user_books with the appropriate status
      await addBookToReadingList(book.id, action as BookAction);

      // Update status in UI
      const statusesResult = await getUserBookStatuses([book.id]);
      if (statusesResult && !("success" in statusesResult)) {
        setUserBookStatuses((prev) => ({
          ...prev,
          [book.id]: statusesResult[book.id],
        }));
      }

      // For custom shelves, also add the book to the shelf
      if (shelf?.type === "custom") {
        const addedToShelf = await handleAddBookToShelfOnly(book.id);

        if (addedToShelf) {
          // Clear search after successfully adding to shelf
          setSearchQuery("");
          setSearchResults([]);
          setHasSearched(false);
        }
      }
    },
    [shelf, handleAddBookToShelfOnly]
  );

  const handleSearchStatusChange = useCallback(
    async (bookId: string, newStatus: ReadingStatus) => {
      setUserBookStatuses((prev) => ({
        ...prev,
        [bookId]: newStatus,
      }));

      // For custom shelves, also add the book to the shelf
      // This handles cases where BookSearchResultCard doesn't call onAction
      // (e.g., "finished", "paused", "dnf" statuses)
      if (shelf?.type === "custom") {
        const addedToShelf = await handleAddBookToShelfOnly(bookId);

        if (addedToShelf) {
          // Clear search after successfully adding to shelf
          setSearchQuery("");
          setSearchResults([]);
          setHasSearched(false);
        }
      }
    },
    [shelf, handleAddBookToShelfOnly]
  );

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Check if click is outside any menu
      if (
        openMenuId &&
        !target.closest("[data-book-menu]") &&
        !target.closest("[data-menu-button]")
      ) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading shelf...</p>
        </div>
      </div>
    );
  }

  if (!shelf) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-xl hover:bg-muted transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {shelf.name}
                </h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {books.length} {books.length === 1 ? "Book" : "Books"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {totalPages.toLocaleString()} Total Pages
                  </span>
                  {shelf.type === "custom" && (
                    <Badge variant="outline" className="text-xs">
                      Private
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="sticky top-[120px] z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="w-full">
              <Input
                type="text"
                placeholder="Search for books to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                rightIcon={
                  searchQuery ? (
                    isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                          setHasSearched(false);
                          setSearchError(null);
                        }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )
                  ) : null
                }
                className="w-full"
                disabled={isSearching}
              />
            </div>

            {/* Sort and View Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
                  Sort:
                </span>
                <div className="bg-muted rounded-lg p-1 flex-1 sm:flex-initial">
                  <div className="grid grid-cols-3 sm:flex gap-1">
                    {[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "title", label: "Title" },
                      { value: "progress", label: "Progress" },
                      { value: "shortest", label: "Shortest" },
                    ].map((option) => {
                      const isActive = sortBy === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant="ghost"
                          size="sm"
                          onClick={() => setSortBy(option.value as SortOption)}
                          className={`rounded-lg text-xs whitespace-nowrap ${
                            isActive
                              ? "bg-background text-foreground shadow-sm font-medium"
                              : ""
                          }`}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1 self-start sm:self-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg ${
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-sm"
                      : ""
                  }`}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg ${
                    viewMode === "list"
                      ? "bg-background text-foreground shadow-sm"
                      : ""
                  }`}
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <section className="px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Search Results */}
            {hasSearched && (
              <div className="mb-8 space-y-6 animate-in fade-in-50 duration-200">
                {searchError && (
                  <p className="text-sm text-destructive">{searchError}</p>
                )}
                {isSearching && searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">
                      Searching for books...
                    </p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found{" "}
                        <span className="font-semibold text-foreground">
                          {searchTotal.toLocaleString()}
                        </span>{" "}
                        result{searchTotal !== 1 ? "s" : ""}
                        {searchTotal > searchResults.length && (
                          <span> (showing {searchResults.length})</span>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {searchResults.map((book) => (
                        <BookSearchResultCard
                          key={book.id}
                          book={book}
                          userBookStatus={userBookStatuses[book.id]}
                          onAction={handleSearchBookAction}
                          onStatusChange={handleSearchStatusChange}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-xl font-medium mb-2">No books found</p>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Shelf Books */}
            {!hasSearched && filteredBooks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📚</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? "No books found" : "This shelf is empty"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Start building your collection by adding books to this shelf"}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/search">Add a book</Link>
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <ShelfBookGrid
                books={filteredBooks.map((b) => ({
                  ...b,
                  rating: b.rating ?? undefined,
                  reviewAttributes: {},
                  status: b.status || ("want_to_read" as ReadingStatus),
                }))}
                sortBy={sortBy}
                onStatusChange={handleStatusChange}
                onRemove={handleRemove}
                onRatingUpdate={handleRatingUpdate}
              />
            ) : (
              <div className="space-y-4">
                {filteredBooks.map((book) => {
                  const progress =
                    book.totalPages > 0
                      ? Math.round((book.pagesRead / book.totalPages) * 100)
                      : 0;
                  const isFinished = book.status === "finished";
                  const isCurrentlyReading =
                    book.status === "currently_reading";

                  return (
                    <div
                      key={book.id}
                      className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      {/* Book Cover */}
                      <div className="relative w-20 h-30 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={book.cover || "/placeholder.svg"}
                          alt={book.title}
                          width={80}
                          height={120}
                          className="w-full h-full object-cover"
                        />
                        {isFinished && book.rating && (
                          <div className="absolute top-1 right-1 bg-background/90 rounded px-1.5 py-0.5 flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-xs ${
                                  i < Math.floor(book.rating!)
                                    ? "text-yellow-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
                          {book.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {book.author}
                        </p>

                        {/* Progress Bar for Currently Reading */}
                        {isCurrentlyReading && book.totalPages > 0 && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {book.pagesRead} / {book.totalPages} pages
                              </span>
                              <span className="text-muted-foreground">
                                {progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Rating for Finished */}
                        {isFinished && book.rating && (
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${
                                  i < Math.floor(book.rating!)
                                    ? "text-yellow-500"
                                    : "text-muted-foreground"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="text-xs text-muted-foreground ml-1">
                              {book.rating}
                            </span>
                          </div>
                        )}

                        {/* Status Badge */}
                        {book.status && (
                          <Badge variant="secondary" className="text-xs">
                            {formatStatusLabel(book.status)}
                          </Badge>
                        )}
                      </div>

                      {/* Menu */}
                      <div className="flex-shrink-0 relative" data-book-menu>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="More options"
                          data-menu-button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === book.id ? null : book.id
                            );
                          }}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        {openMenuId === book.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                // Navigate to book detail or open edit dialog
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-accent transition-colors text-sm"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                // Handle move to shelf
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-accent transition-colors text-sm"
                            >
                              <BookMarked className="w-4 h-4" />
                              Move to shelf
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                if (book.status) {
                                  handleRemove(book.id, book.status);
                                }
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-destructive/10 text-destructive transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
