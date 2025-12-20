import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchAndNormalizeBooks, type NormalizedBook } from "@/lib/open-library";
import type { Book, BookInsert } from "@/types/database.types";

/**
 * Convert a NormalizedBook to a BookInsert for Supabase
 */
function toBookInsert(book: NormalizedBook): BookInsert {
  return {
    open_library_id: book.openLibraryId,
    open_library_edition_id: book.openLibraryEditionId ?? null,
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
 * Save books to the database, upserting on open_library_id
 * Returns the saved books with their database IDs
 */
async function saveBooksToDatabase(books: NormalizedBook[]): Promise<Book[]> {
  if (books.length === 0) return [];

  const bookInserts = books.map(toBookInsert);

  const { data, error } = await supabaseAdmin
    .from("books")
    .upsert(bookInserts, {
      onConflict: "open_library_id",
      ignoreDuplicates: false, // Update existing records
    })
    .select();

  if (error) {
    console.error("Error saving books to database:", error);
    throw new Error(`Failed to save books: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Check if we have cached books for any of the Open Library IDs
 */
async function getCachedBooks(openLibraryIds: string[]): Promise<Map<string, Book>> {
  if (openLibraryIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("books")
    .select("*")
    .in("open_library_id", openLibraryIds);

  if (error) {
    console.error("Error fetching cached books:", error);
    return new Map();
  }

  const cache = new Map<string, Book>();
  for (const book of data ?? []) {
    cache.set(book.open_library_id, book);
  }
  return cache;
}

export interface LazyFetchResult {
  books: Book[];
  total: number;
  fromCache: number;
  fromOpenLibrary: number;
}

/**
 * Lazy Fetch Service
 * 
 * Searches Open Library for books and saves them to the database.
 * This implements a "lazy fetch" pattern:
 * 1. Search Open Library for the query
 * 2. Check which books are already in our database
 * 3. Save new books to the database
 * 4. Return all books with their database IDs
 * 
 * @param query - Search query string
 * @param options - Search options (limit, offset)
 * @returns Books from the database (newly saved + cached)
 */
export async function lazyFetchBooks(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<LazyFetchResult> {
  const { limit = 20, offset = 0 } = options;

  // Step 1: Search Open Library
  const { books: normalizedBooks, total } = await searchAndNormalizeBooks(query, {
    limit,
    offset,
  });

  if (normalizedBooks.length === 0) {
    return { books: [], total: 0, fromCache: 0, fromOpenLibrary: 0 };
  }

  // Step 2: Check which books are already cached
  const openLibraryIds = normalizedBooks.map((b) => b.openLibraryId);
  const cachedBooks = await getCachedBooks(openLibraryIds);

  // Step 3: Determine which books need to be saved
  const newBooks = normalizedBooks.filter(
    (b) => !cachedBooks.has(b.openLibraryId)
  );

  // Step 4: Save new books to database
  let savedBooks: Book[] = [];
  if (newBooks.length > 0) {
    savedBooks = await saveBooksToDatabase(newBooks);
    
    // Add saved books to cache map
    for (const book of savedBooks) {
      cachedBooks.set(book.open_library_id, book);
    }
  }

  // Step 5: Return books in the original search order
  const resultBooks: Book[] = [];
  for (const normalized of normalizedBooks) {
    const cached = cachedBooks.get(normalized.openLibraryId);
    if (cached) {
      resultBooks.push(cached);
    }
  }

  return {
    books: resultBooks,
    total,
    fromCache: cachedBooks.size - newBooks.length,
    fromOpenLibrary: newBooks.length,
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
 * Get a book by its Open Library ID
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

