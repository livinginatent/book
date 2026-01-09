"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { ReadingStatus, Shelf } from "@/types/database.types";

export type ShelfType = "default" | "custom";

const FREE_SHELF_LIMIT = 3;
const PREMIUM_SHELF_LIMIT = 12;

export interface ShelfWithCount extends Shelf {
  book_count: number;
}

export interface ShelvesResult {
  success: true;
  defaultShelves: ShelfWithCount[];
  customShelves: ShelfWithCount[];
}

export interface ShelvesError {
  success: false;
  error: string;
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Find shelf by ID or slug - optimized to avoid fetching all shelves
 * Returns the shelf ID if found
 */
async function findShelfByIdOrSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  shelfIdOrSlug: string
): Promise<{ id: string } | null> {
  if (isUUID(shelfIdOrSlug)) {
    const { data } = await supabase
      .from("shelves")
      .select("id")
      .eq("id", shelfIdOrSlug)
      .eq("user_id", userId)
      .single();
    return data;
  }

  // For slugs, fetch only id and name columns
  const { data: shelves } = await supabase
    .from("shelves")
    .select("id, name")
    .eq("user_id", userId);

  if (!shelves) return null;

  const normalizedSlug = shelfIdOrSlug.toLowerCase();
  const match = shelves.find((s) => slugify(s.name) === normalizedSlug);
  return match ? { id: match.id } : null;
}

/**
 * Get shelves for the authenticated user, including book counts
 * Optimized with parallel queries
 */
export async function getShelves(): Promise<ShelvesResult | ShelvesError> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Parallel queries for shelves and status counts
    const [shelvesResult, userBooksResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("id, name, type, status, user_id, created_at, updated_at")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("user_books").select("status").eq("user_id", user.id),
    ]);

    if (shelvesResult.error) {
      console.error("Error fetching shelves:", shelvesResult.error);
      return { success: false, error: "Failed to fetch shelves" };
    }

    // Count statuses in memory
    const countMap: Record<ReadingStatus, number> = {
      want_to_read: 0,
      currently_reading: 0,
      finished: 0,
      dnf: 0,
      up_next: 0,
      paused: 0,
    };

    if (!userBooksResult.error) {
      for (const row of userBooksResult.data || []) {
        const status = row.status as ReadingStatus;
        if (status in countMap) countMap[status] += 1;
      }
    }

    const defaultShelves: ShelfWithCount[] = [];
    const customShelves: ShelfWithCount[] = [];

    for (const shelf of shelvesResult.data || []) {
      const base: ShelfWithCount = {
        ...shelf,
        book_count:
          shelf.type === "default" && shelf.status
            ? (countMap[shelf.status as ReadingStatus] ?? 0)
            : 0,
      };

      if (shelf.type === "default") {
        defaultShelves.push(base);
      } else {
        customShelves.push(base);
      }
    }

    return { success: true, defaultShelves, customShelves };
  } catch (error) {
    console.error("Get shelves error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create a custom shelf for the authenticated user
 * Optimized with parallel limit check
 */
export async function createCustomShelf(
  name: string
): Promise<
  { success: true; shelf: ShelfWithCount } | { success: false; error: string }
> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "Shelf name is required" };
  }

  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Parallel: check shelf count and subscription tier
    const [countResult, profileResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "custom"),
      supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", user.id)
        .single(),
    ]);

    if (countResult.error) {
      console.error("Error counting custom shelves:", countResult.error);
      return { success: false, error: "Failed to create shelf" };
    }

    const tier = profileResult.data?.subscription_tier;
    const limit =
      tier === "premium" || tier === "bibliophile"
        ? PREMIUM_SHELF_LIMIT
        : FREE_SHELF_LIMIT;

    if ((countResult.count ?? 0) >= limit) {
      return {
        success: false,
        error:
          "Limit reached. Upgrade to Bibliophile for unlimited private shelves.",
      };
    }

    const { data, error: insertError } = await supabase
      .from("shelves")
      .insert({
        user_id: user.id,
        name: trimmedName,
        type: "custom",
      })
      .select("id, name, type, status, user_id, created_at, updated_at")
      .single();

    if (insertError || !data) {
      console.error("Error creating custom shelf:", insertError);
      return { success: false, error: "Failed to create shelf" };
    }

    return {
      success: true,
      shelf: { ...data, book_count: 0 },
    };
  } catch (error) {
    console.error("Create custom shelf error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get shelf details by ID or slug
 * Optimized with parallel book count query
 */
export async function getShelfById(
  shelfIdOrSlug: string
): Promise<
  { success: true; shelf: ShelfWithCount } | { success: false; error: string }
> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Find shelf ID (optimized for slugs)
    const shelfRef = await findShelfByIdOrSlug(
      supabase,
      user.id,
      shelfIdOrSlug
    );
    if (!shelfRef) {
      return { success: false, error: "Shelf not found" };
    }

    // Fetch full shelf data
    const { data: shelf, error: shelfError } = await supabase
      .from("shelves")
      .select("id, name, type, status, user_id, created_at, updated_at")
      .eq("id", shelfRef.id)
      .single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found" };
    }

    // Get book count based on shelf type
    let bookCount = 0;
    if (shelf.type === "default" && shelf.status) {
      const { count } = await supabase
        .from("user_books")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", shelf.status);
      bookCount = count ?? 0;
    } else if (shelf.type === "custom") {
      const { count } = await supabase
        .from("shelf_books")
        .select("id", { count: "exact", head: true })
        .eq("shelf_id", shelf.id);
      bookCount = count ?? 0;
    }

    return {
      success: true,
      shelf: { ...shelf, book_count: bookCount },
    };
  } catch (error) {
    console.error("Get shelf by ID error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface ShelfBookData {
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

/**
 * Get books for a shelf by ID or slug
 * Optimized with parallel queries and minimal data fetching
 */
export async function getShelfBooks(
  shelfIdOrSlug: string
): Promise<
  { success: true; books: ShelfBookData[] } | { success: false; error: string }
> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Find shelf (optimized)
    const shelfRef = await findShelfByIdOrSlug(
      supabase,
      user.id,
      shelfIdOrSlug
    );
    if (!shelfRef) {
      return { success: false, error: "Shelf not found" };
    }

    // Get shelf type and status
    const { data: shelf, error: shelfError } = await supabase
      .from("shelves")
      .select("id, type, status")
      .eq("id", shelfRef.id)
      .single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found" };
    }

    // Fetch user_books based on shelf type
    let userBooks: Array<{
      id: string;
      book_id: string;
      rating: number | null;
      status: string;
      date_added: string;
      date_finished: string | null;
    }> | null = null;
    let sortOrderMap: Map<string, number> | null = null;

    if (shelf.type === "default" && shelf.status) {
      const { data, error } = await supabase
        .from("user_books")
        .select("id, book_id, rating, status, date_added, date_finished")
        .eq("user_id", user.id)
        .eq("status", shelf.status);

      if (error) {
        console.error("Error fetching user books:", error);
        return { success: false, error: "Failed to fetch books" };
      }
      userBooks = data;
    } else if (shelf.type === "custom") {
      // Fetch shelf_books first
      const { data: shelfBooks, error: shelfBooksError } = await supabase
        .from("shelf_books")
        .select("user_book_id, sort_order")
        .eq("shelf_id", shelf.id)
        .order("sort_order", { ascending: true });

      if (shelfBooksError) {
        console.error("Error fetching shelf_books:", shelfBooksError);
        return { success: false, error: "Failed to fetch books" };
      }

      if (!shelfBooks?.length) {
        return { success: true, books: [] };
      }

      sortOrderMap = new Map(
        shelfBooks.map((sb) => [sb.user_book_id, sb.sort_order])
      );
      const userBookIds = shelfBooks.map((sb) => sb.user_book_id);

      const { data, error } = await supabase
        .from("user_books")
        .select("id, book_id, rating, status, date_added, date_finished")
        .eq("user_id", user.id)
        .in("id", userBookIds);

      if (error) {
        console.error("Error fetching user books:", error);
        return { success: false, error: "Failed to fetch books" };
      }
      userBooks = data;
    } else {
      return { success: true, books: [] };
    }

    if (!userBooks?.length) {
      return { success: true, books: [] };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel: fetch books and reading progress
    const [booksResult, progressResult] = await Promise.all([
      supabase
        .from("books")
        .select(
          "id, title, authors, page_count, cover_url_large, cover_url_medium, cover_url_small"
        )
        .in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("book_id, pages_read")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
    ]);

    if (booksResult.error) {
      console.error("Error fetching books:", booksResult.error);
      return { success: false, error: "Failed to fetch books" };
    }

    const progressMap = new Map(
      (progressResult.data || []).map((p) => [p.book_id, p.pages_read])
    );

    // Create book lookup for efficient mapping
    const bookLookup = new Map(booksResult.data?.map((b) => [b.id, b]) || []);

    // Map userBooks to maintain order (important for custom shelves)
    let orderedUserBooks = userBooks;
    if (sortOrderMap) {
      orderedUserBooks = [...userBooks].sort((a, b) => {
        const orderA = sortOrderMap!.get(a.id) ?? 0;
        const orderB = sortOrderMap!.get(b.id) ?? 0;
        return orderA - orderB;
      });
    }

    const books: ShelfBookData[] = [];
    for (const userBook of orderedUserBooks) {
      const book = bookLookup.get(userBook.book_id);
      if (!book) continue;

      books.push({
        id: book.id,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown Author",
        cover:
          book.cover_url_large ||
          book.cover_url_medium ||
          book.cover_url_small ||
          "",
        totalPages: book.page_count || 0,
        pagesRead: progressMap.get(book.id) ?? 0,
        rating: userBook.rating,
        status: userBook.status as ReadingStatus,
        date_added: userBook.date_added,
        dateFinished: userBook.date_finished,
      });
    }

    return { success: true, books };
  } catch (error) {
    console.error("Get shelf books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Combined action: Get shelf details AND books in a single call
 * Major optimization for shelf detail pages
 */
export async function getShelfWithBooks(
  shelfIdOrSlug: string
): Promise<
  | { success: true; shelf: ShelfWithCount; books: ShelfBookData[] }
  | { success: false; error: string }
> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Find shelf (optimized)
    const shelfRef = await findShelfByIdOrSlug(
      supabase,
      user.id,
      shelfIdOrSlug
    );
    if (!shelfRef) {
      return { success: false, error: "Shelf not found" };
    }

    // Get full shelf data
    const { data: shelf, error: shelfError } = await supabase
      .from("shelves")
      .select("id, name, type, status, user_id, created_at, updated_at")
      .eq("id", shelfRef.id)
      .single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found" };
    }

    // Fetch user_books and sort order based on shelf type
    let userBooks: Array<{
      id: string;
      book_id: string;
      rating: number | null;
      status: string;
      date_added: string;
      date_finished: string | null;
    }> | null = null;
    let sortOrderMap: Map<string, number> | null = null;

    if (shelf.type === "default" && shelf.status) {
      const { data, error } = await supabase
        .from("user_books")
        .select("id, book_id, rating, status, date_added, date_finished")
        .eq("user_id", user.id)
        .eq("status", shelf.status);

      if (error) {
        console.error("Error fetching user books:", error);
        return { success: false, error: "Failed to fetch books" };
      }
      userBooks = data;
    } else if (shelf.type === "custom") {
      const { data: shelfBooks, error: shelfBooksError } = await supabase
        .from("shelf_books")
        .select("user_book_id, sort_order")
        .eq("shelf_id", shelf.id)
        .order("sort_order", { ascending: true });

      if (shelfBooksError) {
        console.error("Error fetching shelf_books:", shelfBooksError);
        return { success: false, error: "Failed to fetch books" };
      }

      if (!shelfBooks?.length) {
        return {
          success: true,
          shelf: { ...shelf, book_count: 0 },
          books: [],
        };
      }

      sortOrderMap = new Map(
        shelfBooks.map((sb) => [sb.user_book_id, sb.sort_order])
      );
      const userBookIds = shelfBooks.map((sb) => sb.user_book_id);

      const { data, error } = await supabase
        .from("user_books")
        .select("id, book_id, rating, status, date_added, date_finished")
        .eq("user_id", user.id)
        .in("id", userBookIds);

      if (error) {
        console.error("Error fetching user books:", error);
        return { success: false, error: "Failed to fetch books" };
      }
      userBooks = data;
    }

    if (!userBooks?.length) {
      return {
        success: true,
        shelf: { ...shelf, book_count: 0 },
        books: [],
      };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Parallel: fetch books and reading progress
    const [booksResult, progressResult] = await Promise.all([
      supabase
        .from("books")
        .select(
          "id, title, authors, page_count, cover_url_large, cover_url_medium, cover_url_small"
        )
        .in("id", bookIds),
      supabase
        .from("reading_progress")
        .select("book_id, pages_read")
        .eq("user_id", user.id)
        .in("book_id", bookIds),
    ]);

    if (booksResult.error) {
      console.error("Error fetching books:", booksResult.error);
      return { success: false, error: "Failed to fetch books" };
    }

    const progressMap = new Map(
      (progressResult.data || []).map((p) => [p.book_id, p.pages_read])
    );
    const bookLookup = new Map(booksResult.data?.map((b) => [b.id, b]) || []);

    let orderedUserBooks = userBooks;
    if (sortOrderMap) {
      orderedUserBooks = [...userBooks].sort((a, b) => {
        const orderA = sortOrderMap!.get(a.id) ?? 0;
        const orderB = sortOrderMap!.get(b.id) ?? 0;
        return orderA - orderB;
      });
    }

    const books: ShelfBookData[] = [];
    for (const userBook of orderedUserBooks) {
      const book = bookLookup.get(userBook.book_id);
      if (!book) continue;

      books.push({
        id: book.id,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown Author",
        cover:
          book.cover_url_large ||
          book.cover_url_medium ||
          book.cover_url_small ||
          "",
        totalPages: book.page_count || 0,
        pagesRead: progressMap.get(book.id) ?? 0,
        rating: userBook.rating,
        status: userBook.status as ReadingStatus,
        date_added: userBook.date_added,
        dateFinished: userBook.date_finished,
      });
    }

    return {
      success: true,
      shelf: { ...shelf, book_count: books.length },
      books,
    };
  } catch (error) {
    console.error("Get shelf with books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface AddBookToShelfResult {
  success: true;
}

export interface AddBookToShelfError {
  success: false;
  error: string;
}

/**
 * Get user_book_id from book_id for the authenticated user
 */
export async function getUserBookId(
  bookId: string
): Promise<
  { success: true; userBookId: string } | { success: false; error: string }
> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: userBook, error: userBookError } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (userBookError || !userBook) {
      return { success: false, error: "Book not found in your library" };
    }

    return { success: true, userBookId: userBook.id };
  } catch (error) {
    console.error("Get user book ID error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Add a book to a custom shelf
 * Optimized with parallel verification queries
 */
export async function addBookToShelf(
  shelfId: string,
  userBookId: string
): Promise<AddBookToShelfResult | AddBookToShelfError> {
  try {
    const supabase = await createClient(cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Parallel: verify shelf, user_book, and get sort_order
    const [shelfResult, userBookResult, sortOrderResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("id, name")
        .eq("id", shelfId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_books")
        .select("id")
        .eq("id", userBookId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("shelf_books")
        .select("sort_order")
        .eq("shelf_id", shelfId)
        .order("sort_order", { ascending: false })
        .limit(1),
    ]);

    if (shelfResult.error || !shelfResult.data) {
      return { success: false, error: "Shelf not found or access denied" };
    }

    if (userBookResult.error || !userBookResult.data) {
      return { success: false, error: "Book not found or access denied" };
    }

    if (sortOrderResult.error) {
      console.error("Error fetching sort_order:", sortOrderResult.error);
      return { success: false, error: "Failed to fetch shelf order" };
    }

    const newSortOrder =
      sortOrderResult.data?.length > 0
        ? (sortOrderResult.data[0].sort_order ?? 0) + 1
        : 0;

    const { error: insertError } = await supabase.from("shelf_books").insert({
      shelf_id: shelfId,
      user_book_id: userBookId,
      sort_order: newSortOrder,
    });

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message.includes("unique") ||
        insertError.message.includes("duplicate")
      ) {
        return { success: false, error: "This book is already in this shelf" };
      }
      console.error("Error adding book to shelf:", insertError);
      return { success: false, error: "Failed to add book to shelf" };
    }

    revalidatePath("/", "layout");
    revalidatePath(`/shelves/${slugify(shelfResult.data.name)}`);

    return { success: true };
  } catch (error) {
    console.error("Add book to shelf error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
