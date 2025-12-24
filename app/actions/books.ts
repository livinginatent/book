"use server";
import {
  lazyFetchBooks,
  getBookById,
  getBookByOpenLibraryId,
} from "@/lib/books";
import type { Book } from "@/types/database.types";

export interface SearchBooksResult {
  success: true;
  books: Book[];
  total: number;
  fromCache: number;
  fromGoogleBooks: number;
  hasMore: boolean;
}

export interface SearchBooksError {
  success: false;
  error: string;
}

/**
 * Server action to search books
 *
 * Uses the Lazy Fetch pattern with optimizations:
 * 1. Limits API requests to prevent overwhelming fetches
 * 2. Only fetches what's needed for the current page
 * 3. Returns pagination metadata
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default: 20)
 * @param offset - Offset for pagination (default: 0)
 */
export async function searchBooks(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<SearchBooksResult | SearchBooksError> {
  try {
    // Validate query
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { success: false, error: "Search query is required" };
    }
    if (trimmedQuery.length < 2) {
      return {
        success: false,
        error: "Search query must be at least 2 characters",
      };
    }

    // Validate pagination - keep limits reasonable
    const safeLimit = Math.min(Math.max(1, limit), 50); // Reduced max from 100 to 50
    const safeOffset = Math.max(0, offset);

    // Maximum total results to ever fetch (prevents 22k book scenarios)
    const MAX_TOTAL_RESULTS = 500;

    // Don't allow offsetting beyond reasonable limits
    if (safeOffset >= MAX_TOTAL_RESULTS) {
      return {
        success: true,
        books: [],
        total: MAX_TOTAL_RESULTS,
        fromCache: 0,
        fromGoogleBooks: 0,
        hasMore: false,
      };
    }

    // Get API key from environment variable
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

    // Perform lazy fetch with limit enforcement
    const result = await lazyFetchBooks(trimmedQuery, {
      limit: safeLimit,
      offset: safeOffset,
      apiKey,
    });

    // Cap the total at our maximum
    const cappedTotal = Math.min(result.total, MAX_TOTAL_RESULTS);
    const hasMore = safeOffset + result.books.length < cappedTotal;

    return {
      success: true,
      books: result.books,
      total: cappedTotal,
      fromCache: result.fromCache,
      fromGoogleBooks: result.fromGoogleBooks,
      hasMore,
    };
  } catch (error) {
    console.error("Search books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Server action to get a single book by ID
 */
export async function getBook(
  id: string
): Promise<{ success: true; book: Book } | { success: false; error: string }> {
  try {
    if (!id) {
      return { success: false, error: "Book ID is required" };
    }

    const book = await getBookById(id);

    if (!book) {
      return { success: false, error: "Book not found" };
    }

    return { success: true, book };
  } catch (error) {
    console.error("Get book error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Server action to get a book by its Open Library ID
 */
export async function getBookByOLId(
  openLibraryId: string
): Promise<{ success: true; book: Book } | { success: false; error: string }> {
  try {
    if (!openLibraryId) {
      return { success: false, error: "Open Library ID is required" };
    }

    const book = await getBookByOpenLibraryId(openLibraryId);

    if (!book) {
      return { success: false, error: "Book not found" };
    }

    return { success: true, book };
  } catch (error) {
    console.error("Get book by OL ID error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
