/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Search, Loader2, BookOpen, X, ChevronDown } from "lucide-react";
import { useState, useTransition, useEffect, useRef } from "react";

import { searchBooks } from "@/app/actions/books";
import { BookAction } from "@/components/ui/book/book-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Book } from "@/types/database.types";

import { BookSearchResultCard } from "./book-search-result-card";


interface BookSearchProps {
  className?: string;
}

const INITIAL_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;
const DEBOUNCE_DELAY = 500;
const MIN_QUERY_LENGTH = 3;

export function BookSearch({ className }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [displayedResults, setDisplayedResults] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LENGTH) {
      if (trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH) {
        setError(`Please enter at least ${MIN_QUERY_LENGTH} characters`);
      } else {
        setError(null);
      }

      if (hasSearched) {
        setDisplayedResults([]);
        setTotal(0);
        setHasSearched(false);
        setCurrentOffset(0);
      }
      return;
    }

    setError(null);

    debounceTimerRef.current = setTimeout(() => {
      const currentQuery = query.trim();
      if (currentQuery.length < MIN_QUERY_LENGTH) return;

      setHasSearched(true);
      setCurrentOffset(0);

      startTransition(async () => {
        const result = await searchBooks(currentQuery, INITIAL_LIMIT, 0);

        if (result.success) {
          setDisplayedResults(result.books);
          setTotal(result.total);
        } else {
          setError(result.error);
          setDisplayedResults([]);
          setTotal(0);
        }
      });
    }, DEBOUNCE_DELAY);

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
      const result = await searchBooks(
        trimmedQuery,
        LOAD_MORE_LIMIT,
        newOffset
      );

      if (result.success) {
        setDisplayedResults((prev) => [...prev, ...result.books]);
        setCurrentOffset(newOffset);
      }
    });
  };

  const clearSearch = () => {
    setQuery("");
    setDisplayedResults([]);
    setTotal(0);
    setError(null);
    setHasSearched(false);
    setCurrentOffset(0);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handleBookAction = async (action: BookAction, book: Book) => {
    const { addBookToReadingList } = await import("@/app/actions/book-actions");
    const result = await addBookToReadingList(book.id, action);
    
    if (result.success) {
      // Dispatch event to refresh currently reading component
      // Use a small delay to ensure server action has completed
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("book-added", { 
          detail: { action, bookId: book.id } 
        }));
      }, 100);
      // Show success feedback (you can add a toast notification here)
      console.log(result.message);
    } else {
      // Show error feedback
      console.error(result.error);
    }
  };

  const hasMore = displayedResults.length < total;

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="mb-8">
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
                    className="text-muted-foreground flex items-center justify-center hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )
              ) : null
            }
            disabled={isPending}
            className="text-lg  h-14 pr-12"
          />
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {isPending && displayedResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 animate-in fade-in-50 duration-200">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Searching for the books...</p>
            </div>
          ) : displayedResults.length > 0 ? (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found{" "}
                  <span className="font-semibold text-foreground">
                    {total.toLocaleString()}
                  </span>{" "}
                  result
                  {total !== 1 ? "s" : ""}
                  {total > displayedResults.length && (
                    <span> (showing {displayedResults.length})</span>
                  )}
                </p>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {displayedResults.map((book) => (
                  <BookSearchResultCard
                    key={book.id}
                    book={book}
                    onAction={handleBookAction}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={isPending}
                    variant="outline"
                    size="lg"
                    className="gap-2 rounded-full px-8 bg-transparent"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Load More Books
                      </>
                    )}
                  </Button>
                </div>
              )}
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

      {/* Empty State - Before Search */}
   {/*    {!hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <p className="text-xl font-semibold mb-2">Search for Books</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Search the database to discover millions of books.
          </p>
        </div>
      )} */}
    </div>
  );
}
