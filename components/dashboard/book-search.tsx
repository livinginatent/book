"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen, X, ChevronRight } from "lucide-react";
import { searchBooks } from "@/app/actions/books";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Book } from "@/types/database.types";

interface BookSearchProps {
  className?: string;
}

const INITIAL_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;
const DEBOUNCE_DELAY = 500; // 500ms delay
const MIN_QUERY_LENGTH = 3; // Minimum characters required for search

export function BookSearch({ className }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<Book[]>([]);
  const [displayedResults, setDisplayedResults] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmedQuery = query.trim();
    
    // Reset if query is too short or empty - do this immediately, no debounce
    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) {
      // Only show error if user has typed something but it's too short
      if (trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH) {
        setError(`Please enter at least ${MIN_QUERY_LENGTH} characters`);
      } else {
        setError(null);
      }
      
      // Clear results if query becomes too short
      if (hasSearched) {
        setAllResults([]);
        setDisplayedResults([]);
        setTotal(0);
        setHasSearched(false);
        setCurrentOffset(0);
      }
      return;
    }

    // Clear error when query becomes valid
    setError(null);

    // Only set up debounce timer if query is long enough
    // This prevents any search from happening if query is too short
    debounceTimerRef.current = setTimeout(() => {
      // Double-check query is still valid before searching
      const currentQuery = query.trim();
      if (currentQuery.length < MIN_QUERY_LENGTH) {
        return;
      }

      setHasSearched(true);
      setCurrentOffset(0);

      startTransition(async () => {
        const result = await searchBooks(currentQuery, INITIAL_LIMIT, 0);
        
        if (result.success) {
          setAllResults(result.books);
          setDisplayedResults(result.books);
          setTotal(result.total);
        } else {
          setError(result.error);
          setAllResults([]);
          setDisplayedResults([]);
          setTotal(0);
        }
      });
    }, DEBOUNCE_DELAY);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [query, hasSearched]);

  const loadMore = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) return;

    const newOffset = currentOffset + displayedResults.length;
    
    startTransition(async () => {
      const result = await searchBooks(trimmedQuery, LOAD_MORE_LIMIT, newOffset);
      
      if (result.success) {
        setAllResults((prev) => [...prev, ...result.books]);
        setDisplayedResults((prev) => [...prev, ...result.books]);
        setCurrentOffset(newOffset);
      }
    });
  };

  const clearSearch = () => {
    setQuery("");
    setAllResults([]);
    setDisplayedResults([]);
    setTotal(0);
    setError(null);
    setHasSearched(false);
    setCurrentOffset(0);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: "smooth",
      });
    }
  };

  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasMore = displayedResults.length < total;

  // Check if container can scroll
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const canScroll =
          scrollContainerRef.current.scrollWidth >
          scrollContainerRef.current.clientWidth;
        setCanScrollRight(canScroll);
      }
    };

    checkScroll();
    // Re-check when results change
    const timer = setTimeout(checkScroll, 100);
    return () => clearTimeout(timer);
  }, [displayedResults]);

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search for books by title, author, or ISBN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="w-5 h-5" />}
            rightIcon={
              query ? (
                isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )
              ) : null
            }
            disabled={isPending}
            className="text-lg h-14 pr-12"
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {isPending && displayedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 animate-in fade-in-50 duration-200">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching Open Library...</p>
            </div>
          ) : displayedResults.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Found {total.toLocaleString()} result{total !== 1 ? "s" : ""}
                  {total > displayedResults.length && ` (showing ${displayedResults.length})`}
                </p>
                {hasMore && (
                  <Button
                    onClick={loadMore}
                    disabled={isPending}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Show More
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {/* Horizontal Scrollable Container */}
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {displayedResults.map((book) => (
                    <div key={book.id} className="flex-shrink-0 w-32">
                      <BookSearchResultCard book={book} />
                    </div>
                  ))}
                </div>
                
                {/* Scroll Right Button */}
                {canScrollRight && (
                  <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg hover:bg-background transition-colors z-10"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No books found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State - Before Search */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-2xl">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Search for Books</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Search Open Library to discover millions of books. Results are automatically saved to your database.
          </p>
        </div>
      )}
    </div>
  );
}

interface BookSearchResultCardProps {
  book: Book;
}

function BookSearchResultCard({ book }: BookSearchResultCardProps) {
  const [imageError, setImageError] = useState(false);
  const coverUrl = book.cover_url_small || book.cover_url_medium || book.cover_url_large;
  const authors = book.authors.join(", ") || "Unknown Author";
  const showPlaceholder = !coverUrl || imageError;

  return (
    <div className="group relative flex flex-col transition-transform duration-300 hover:-translate-y-1 cursor-pointer">
      {/* Book Cover - Smaller size */}
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-md shadow-foreground/5 mb-2 bg-muted">
        {showPlaceholder ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Book Info */}
      <h4 className="font-semibold text-foreground line-clamp-2 leading-tight mb-0.5 text-xs">
        {book.title}
      </h4>
      <p className="text-[10px] text-muted-foreground line-clamp-1">
        {authors}
      </p>
    </div>
  );
}

