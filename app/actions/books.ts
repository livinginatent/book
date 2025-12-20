"use server";

import { lazyFetchBooks, getBookById, getBookByOpenLibraryId } from "@/lib/books";
import type { Book } from "@/types/database.types";

export interface SearchBooksResult {
  success: true;
  books: Book[];
  total: number;
  fromCache: number;
  fromOpenLibrary: number;
}

export interface SearchBooksError {
  success: false;
  error: string;
}

/**
 * Server action to search books
 * 
 * Uses the Lazy Fetch pattern:
 * 1. Searches Open Library for the query
 * 2. Saves new books to the database
 * 3. Returns books with database IDs
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
      return { success: false, error: "Search query must be at least 2 characters" };
    }

    // Validate pagination
    const safeLimit = Math.min(Math.max(1, limit), 100); // 1-100
    const safeOffset = Math.max(0, offset);

    // Perform lazy fetch
    const result = await lazyFetchBooks(trimmedQuery, {
      limit: safeLimit,
      offset: safeOffset,
    });

    return {
      success: true,
      books: result.books,
      total: result.total,
      fromCache: result.fromCache,
      fromOpenLibrary: result.fromOpenLibrary,
    };
  } catch (error) {
    console.error("Search books error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
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
      error: error instanceof Error ? error.message : "An unexpected error occurred",
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
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

