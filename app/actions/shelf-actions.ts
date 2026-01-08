"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
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

async function getUserShelfLimit(userId: string): Promise<number> {
  const supabase = await createClient(cookies());

  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching subscription tier:", error);
    return FREE_SHELF_LIMIT;
  }

  const tier = data?.subscription_tier;

  if (tier === "premium" || tier === "bibliophile") return PREMIUM_SHELF_LIMIT;

  return FREE_SHELF_LIMIT;
}

/**
 * Get shelves for the authenticated user, including book counts
 * Optimized with parallel queries
 */
export async function getShelves(): Promise<ShelvesResult | ShelvesError> {
  const timer = createTimer("getShelves");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getShelves.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Parallel queries for shelves and user_books
    const queryTimer = createTimer("getShelves.queries");
    const [shelvesResult, userBooksResult] = await Promise.all([
      supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("user_books").select("status").eq("user_id", user.id),
    ]);
    queryTimer.end();

    if (shelvesResult.error) {
      console.error("Error fetching shelves:", shelvesResult.error);
      timer.end();
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
        if (status in countMap) {
          countMap[status] += 1;
        }
      }
    }

    const defaultShelves: ShelfWithCount[] = [];
    const customShelves: ShelfWithCount[] = [];

    for (const shelf of shelvesResult.data || []) {
      const base: ShelfWithCount = {
        ...shelf,
        book_count:
          shelf.type === "default" && shelf.status
            ? countMap[shelf.status as ReadingStatus] ?? 0
            : 0,
      };

      if (shelf.type === "default") {
        defaultShelves.push(base);
      } else {
        customShelves.push(base);
      }
    }

    timer.end();
    return {
      success: true,
      defaultShelves,
      customShelves,
    };
  } catch (error) {
    timer.end();
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
 */
export async function createCustomShelf(
  name: string
): Promise<
  { success: true; shelf: ShelfWithCount } | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false, error: "Shelf name is required" };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { count: customShelfCount, error: countError } = await supabase
      .from("shelves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "custom");

    if (countError) {
      console.error("Error counting custom shelves:", countError);
      return { success: false, error: "Failed to create shelf" };
    }

    const limit = await getUserShelfLimit(user.id);

    if ((customShelfCount ?? 0) >= limit) {
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
      .select()
      .single();

    if (insertError || !data) {
      console.error("Error creating custom shelf:", insertError);
      return { success: false, error: "Failed to create shelf" };
    }

    return {
      success: true,
      shelf: {
        ...data,
        book_count: 0,
      },
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
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Get shelf details by ID or slug
 */
export async function getShelfById(
  shelfIdOrSlug: string
): Promise<
  | { success: true; shelf: ShelfWithCount }
  | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Check if it's a UUID (ID) or a slug (name)
    let shelfQuery = supabase
      .from("shelves")
      .select("*")
      .eq("user_id", user.id);

    if (isUUID(shelfIdOrSlug)) {
      // It's an ID, look up by ID
      shelfQuery = shelfQuery.eq("id", shelfIdOrSlug);
    } else {
      // It's a slug, look up by name (case-insensitive, after normalizing)
      // We need to find shelves where the slugified name matches
      const { data: allShelves } = await supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id);

      if (!allShelves) {
        return { success: false, error: "Shelf not found" };
      }

      // Find shelf where slugified name matches
      const matchingShelf = allShelves.find((s) => {
        const shelfSlug = s.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return shelfSlug === shelfIdOrSlug.toLowerCase();
      });

      if (!matchingShelf) {
        return { success: false, error: "Shelf not found" };
      }

      shelfQuery = supabase
        .from("shelves")
        .select("*")
        .eq("id", matchingShelf.id)
        .eq("user_id", user.id);
    }

    const { data: shelf, error: shelfError } = await shelfQuery.single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found" };
    }

    // For default shelves, count books by status
    let bookCount = 0;
    if (shelf.type === "default" && shelf.status) {
      const { count, error: countError } = await supabase
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", shelf.status);

      if (!countError) {
        bookCount = count ?? 0;
      }
    } else if (shelf.type === "custom") {
      // For custom shelves, we'll need to implement shelf_books relationship
      // For now, return 0 - this can be extended when shelf_books table is added
      bookCount = 0;
    }

    return {
      success: true,
      shelf: {
        ...shelf,
        book_count: bookCount,
      },
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

/**
 * Get books for a shelf by ID or slug
 * For default shelves, uses status; for custom shelves, would use shelf_books table
 */
export async function getShelfBooks(
  shelfIdOrSlug: string
): Promise<
  | {
      success: true;
      books: Array<{
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
      }>;
    }
  | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get shelf to determine type (support both ID and slug)
    let shelfQuery = supabase
      .from("shelves")
      .select("*")
      .eq("user_id", user.id);

    if (isUUID(shelfIdOrSlug)) {
      shelfQuery = shelfQuery.eq("id", shelfIdOrSlug);
    } else {
      // It's a slug, look up by name
      const { data: allShelves } = await supabase
        .from("shelves")
        .select("*")
        .eq("user_id", user.id);

      if (!allShelves) {
        return { success: false, error: "Shelf not found" };
      }

      const matchingShelf = allShelves.find((s) => {
        const shelfSlug = s.name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return shelfSlug === shelfIdOrSlug.toLowerCase();
      });

      if (!matchingShelf) {
        return { success: false, error: "Shelf not found" };
      }

      shelfQuery = supabase
        .from("shelves")
        .select("*")
        .eq("id", matchingShelf.id)
        .eq("user_id", user.id);
    }

    const { data: shelf, error: shelfError } = await shelfQuery.single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found" };
    }

    let userBooks;
    let userBooksError;

    if (shelf.type === "default" && shelf.status) {
      // For default shelves, filter by status
      const result = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", shelf.status);
      
      userBooks = result.data;
      userBooksError = result.error;
    } else if (shelf.type === "custom") {
      // For custom shelves, join with shelf_books table
      const { data: shelfBooks, error: shelfBooksError } = await supabase
        .from("shelf_books")
        .select("user_book_id, sort_order")
        .eq("shelf_id", shelf.id)
        .order("sort_order", { ascending: true });

      if (shelfBooksError) {
        console.error("Error fetching shelf_books:", shelfBooksError);
        return { success: false, error: "Failed to fetch books" };
      }

      if (!shelfBooks || shelfBooks.length === 0) {
        return { success: true, books: [] };
      }

      const userBookIds = shelfBooks.map((sb) => sb.user_book_id);

      // Fetch the actual user_books
      const result = await supabase
        .from("user_books")
        .select("*")
        .eq("user_id", user.id)
        .in("id", userBookIds);

      userBooks = result.data;
      userBooksError = result.error;

      // Sort userBooks according to shelf_books sort_order
      if (userBooks) {
        const sortOrderMap = new Map(
          shelfBooks.map((sb) => [sb.user_book_id, sb.sort_order])
        );
        userBooks.sort((a, b) => {
          const orderA = sortOrderMap.get(a.id) ?? 0;
          const orderB = sortOrderMap.get(b.id) ?? 0;
          return orderA - orderB;
        });
      }
    } else {
      return { success: true, books: [] };
    }

    if (userBooksError) {
      console.error("Error fetching user books:", userBooksError);
      return { success: false, error: "Failed to fetch books" };
    }

    if (!userBooks || userBooks.length === 0) {
      return { success: true, books: [] };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Fetch books and reading progress in parallel
    const [booksResult, progressResult] = await Promise.all([
      supabase.from("books").select("*").in("id", bookIds),
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

    const books = (booksResult.data || []).map((book) => {
      const userBook = userBooks.find((ub) => ub.book_id === book.id);
      const pagesRead = progressMap.get(book.id) ?? 0;

      return {
        id: book.id,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown Author",
        cover:
          book.cover_url_large ||
          book.cover_url_medium ||
          book.cover_url_small ||
          "",
        totalPages: book.page_count || 0,
        pagesRead,
        rating: userBook?.rating ?? null,
        status: userBook?.status as ReadingStatus | undefined,
        date_added: userBook?.date_added,
        dateFinished: userBook?.date_finished ?? null,
      };
    });

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
  | { success: true; userBookId: string }
  | { success: false; error: string }
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

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
 * @param shelfId - The shelf ID
 * @param userBookId - The user_book ID
 * @returns Success or error result
 */
export async function addBookToShelf(
  shelfId: string,
  userBookId: string
): Promise<AddBookToShelfResult | AddBookToShelfError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Verify shelf belongs to user
    const { data: shelf, error: shelfError } = await supabase
      .from("shelves")
      .select("id, name, user_id")
      .eq("id", shelfId)
      .eq("user_id", user.id)
      .single();

    if (shelfError || !shelf) {
      return { success: false, error: "Shelf not found or access denied" };
    }

    // Verify user_book belongs to user
    const { data: userBook, error: userBookError } = await supabase
      .from("user_books")
      .select("id, user_id")
      .eq("id", userBookId)
      .eq("user_id", user.id)
      .single();

    if (userBookError || !userBook) {
      return {
        success: false,
        error: "Book not found or access denied",
      };
    }

    // Get the highest current sort_order for this shelf
    const { data: existingBooks, error: sortOrderError } = await supabase
      .from("shelf_books")
      .select("sort_order")
      .eq("shelf_id", shelfId)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (sortOrderError) {
      console.error("Error fetching sort_order:", sortOrderError);
      return { success: false, error: "Failed to fetch shelf order" };
    }

    // Calculate new sort_order (highest + 1, or 0 if shelf is empty)
    const newSortOrder =
      existingBooks && existingBooks.length > 0
        ? (existingBooks[0].sort_order ?? 0) + 1
        : 0;

    // Insert new row into shelf_books
    const { error: insertError } = await supabase
      .from("shelf_books")
      .insert({
        shelf_id: shelfId,
        user_book_id: userBookId,
        sort_order: newSortOrder,
      });

    if (insertError) {
      // Handle unique constraint error gracefully
      if (
        insertError.code === "23505" ||
        insertError.message.includes("unique") ||
        insertError.message.includes("duplicate")
      ) {
        return {
          success: false,
          error: "This book is already in this shelf",
        };
      }

      console.error("Error adding book to shelf:", insertError);
      return {
        success: false,
        error: "Failed to add book to shelf",
      };
    }

    // Revalidate paths
    revalidatePath("/", "layout"); // Dashboard
    const shelfSlug = slugify(shelf.name);
    revalidatePath(`/shelves/${shelfSlug}`); // Specific shelf page

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
