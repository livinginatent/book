import {
  searchAndNormalizeBooks,
  type NormalizedBook,
} from "@/lib/google-books";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Book, BookInsert } from "@/types/database.types";

/**
 * Convert a NormalizedBook to a BookInsert for Supabase
 */
function toBookInsert(book: NormalizedBook): BookInsert {
  return {
    google_books_id: book.googleBooksId,

    title: book.title,
    subtitle: book.subtitle ?? null,
    authors: book.authors,
    description: book.description ?? null,
    subjects: book.subjects,
    publish_date: book.publishDate ?? null,
    publishers: book.publishers,
    isbn_10: book.isbn10.length > 0 ? book.isbn10 : null,
    isbn_13: book.isbn13.length > 0 ? book.isbn13 : null,
    page_count: book.pageCount ?? null,
    cover_url_small: book.coverUrlSmall ?? null,
    cover_url_medium: book.coverUrlMedium ?? null,
    cover_url_large: book.coverUrlLarge ?? null,
    language: book.language ?? null,
  };
}

/**
 * Save books to the database in batches to avoid overwhelming the DB
 * Returns the saved books with their database IDs
 */
async function saveBooksToDatabase(books: NormalizedBook[]): Promise<Book[]> {
  if (books.length === 0) return [];

  const bookInserts = books.map(toBookInsert);
  const BATCH_SIZE = 50; // Process in batches of 50
  const allSavedBooks: Book[] = [];

  // Process in batches to avoid timeouts and memory issues
  for (let i = 0; i < bookInserts.length; i += BATCH_SIZE) {
    const batch = bookInserts.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabaseAdmin
      .from("books")
      .upsert(batch, {
        onConflict: "google_books_id",
        ignoreDuplicates: false, // Update existing records
      })
      .select();

    if (error) {
      console.error(`Error saving books batch ${i / BATCH_SIZE + 1}:`, error);
      // Continue with other batches even if one fails
      continue;
    }

    if (data) {
      allSavedBooks.push(...data);
    }
  }

  return allSavedBooks;
}

/**
 * Check if we have cached books for any of the Google Books IDs
 * Optimized to handle large ID arrays efficiently with parallel queries
 */
async function getCachedBooks(
  googleBooksIds: string[]
): Promise<Map<string, Book>> {
  if (googleBooksIds.length === 0) return new Map();

  const cache = new Map<string, Book>();
  const BATCH_SIZE = 100; // Query in batches to avoid URL length limits

  // Process IDs in batches (can be parallelized for speed)
  const batchPromises: Promise<void>[] = [];

  for (let i = 0; i < googleBooksIds.length; i += BATCH_SIZE) {
    const batchIds = googleBooksIds.slice(i, i + BATCH_SIZE);

    const batchPromise = (async () => {
      const { data, error } = await supabaseAdmin
        .from("books")
        .select("*")
        .in("google_books_id", batchIds);

      if (error) {
        console.error(
          `Error fetching cached books batch ${i / BATCH_SIZE + 1}:`,
          error
        );
        return;
      }

      for (const book of data ?? []) {
        if (book.google_books_id) {
          cache.set(book.google_books_id, book);
        }
      }
    })();

    batchPromises.push(batchPromise);
  }

  // Wait for all batches to complete (parallel execution for speed)
  await Promise.all(batchPromises);

  return cache;
}

export interface LazyFetchResult {
  books: Book[];
  total: number;
  fromCache: number;
  fromGoogleBooks: number;
}

/**
 * Lazy Fetch Service - OPTIMIZED VERSION FOR GOOGLE BOOKS
 *
 * Key optimizations:
 * 1. Only fetches the requested page from Google Books (not all results!)
 * 2. Batches database operations to prevent timeouts
 * 3. Parallel cache queries for speed
 * 4. Uses API key for higher rate limits
 *
 * @param query - Search query string
 * @param options - Search options (limit, offset, apiKey)
 * @returns Books from the database (newly saved + cached)
 */
export async function lazyFetchBooks(
  query: string,
  options: { limit?: number; offset?: number; apiKey?: string } = {}
): Promise<LazyFetchResult> {
  const { limit = 20, offset = 0, apiKey } = options;

  // Step 1: Search Google Books with proper pagination
  // This only fetches the requested page, not all results!
  const { books: normalizedBooks, total } = await searchAndNormalizeBooks(
    query,
    {
      limit,
      offset,
      apiKey,
    }
  );

  if (normalizedBooks.length === 0) {
    return { books: [], total: 0, fromCache: 0, fromGoogleBooks: 0 };
  }

  // Step 2: Check which books are already cached (parallel queries for speed)
  const googleBooksIds = normalizedBooks.map((b) => b.googleBooksId);
  const cachedBooks = await getCachedBooks(googleBooksIds);

  // Step 3: Determine which books need to be saved
  const newBooks = normalizedBooks.filter(
    (b) => !cachedBooks.has(b.googleBooksId)
  );

  // Step 4: Save new books to database (in batches)
  let savedBooks: Book[] = [];
  if (newBooks.length > 0) {
    savedBooks = await saveBooksToDatabase(newBooks);

    // Add saved books to cache map
    for (const book of savedBooks) {
      if (book.google_books_id) {
        cachedBooks.set(book.google_books_id, book);
      }
    }
  }

  // Step 5: Return books in the original search order
  const resultBooks: Book[] = [];
  for (const normalized of normalizedBooks) {
    const cached = cachedBooks.get(normalized.googleBooksId);
    if (cached) {
      resultBooks.push(cached);
    }
  }

  return {
    books: resultBooks,
    total,
    fromCache: cachedBooks.size - newBooks.length,
    fromGoogleBooks: newBooks.length,
  };
}

/**
 * Search books that are already in our database
 * Uses PostgreSQL full-text search for fast local queries
 */
export async function searchLocalBooks(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ books: Book[]; total: number }> {
  const { limit = 20, offset = 0 } = options;

  // Use ilike for simple search (full-text search would require different setup)
  const { data, error, count } = await supabaseAdmin
    .from("books")
    .select("*", { count: "exact" })
    .or(`title.ilike.%${query}%,authors.cs.{${query}}`)
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error searching local books:", error);
    throw new Error(`Failed to search books: ${error.message}`);
  }

  return {
    books: data ?? [],
    total: count ?? 0,
  };
}

/**
 * Get a book by its database ID
 */
export async function getBookById(id: string): Promise<Book | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch book: ${error.message}`);
  }

  return data;
}

/**
 * Get a book by its Google Books ID
 */
export async function getBookByGoogleBooksId(
  googleBooksId: string
): Promise<Book | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("*")
    .eq("google_books_id", googleBooksId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch book: ${error.message}`);
  }

  return data;
}

/**
 * Get a book by its Open Library ID (for backward compatibility)
 */
export async function getBookByOpenLibraryId(
  openLibraryId: string
): Promise<Book | null> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("*")
    .eq("open_library_id", openLibraryId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch book: ${error.message}`);
  }

  return data;
}
