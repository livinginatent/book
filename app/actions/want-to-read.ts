"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createTimer } from "@/lib/utils/perf";
import type { Book, UserBook } from "@/types/database.types";

export interface WantToReadBook extends Book {
  userBook?: UserBook;
  date_added?: string; // Date when book was added to reading list
  isPrioritized?: boolean; // Whether book is in up_next array
}

export interface WantToReadResult {
  success: true;
  books: WantToReadBook[];
  total: number;
  totalPageCount: number;
}

export interface WantToReadError {
  success: false;
  error: string;
}

/**
 * Get want-to-read books for the authenticated user
 * Includes metadata from books table and identifies prioritized books from up_next
 */
export async function getWantToReadBooks(): Promise<
  WantToReadResult | WantToReadError
> {
  const timer = createTimer("getWantToReadBooks");

  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const authTimer = createTimer("getWantToReadBooks.auth");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    authTimer.end();

    if (authError || !user) {
      timer.end();
      return { success: false, error: "You must be logged in" };
    }

    // Parallel fetch of user_books, books, and profile
    const queryTimer = createTimer("getWantToReadBooks.queries");
    const [userBooksResult, profileResult] = await Promise.all([
      // Get user's want-to-read books
      supabase
        .from("user_books")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "want_to_read")
        .order("date_added", { ascending: false }),
      // Get profile to fetch up_next array
      supabase
        .from("profiles")
        .select("up_next")
        .eq("id", user.id)
        .single(),
    ]);
    queryTimer.end();

    if (userBooksResult.error) {
      console.error("Error fetching user_books:", userBooksResult.error);
      timer.end();
      return { success: false, error: "Failed to fetch reading list" };
    }

    if (!userBooksResult.data || userBooksResult.data.length === 0) {
      timer.end();
      return {
        success: true,
        books: [],
        total: 0,
        totalPageCount: 0,
      };
    }

    const userBooks = userBooksResult.data;
    const bookIds = userBooks.map((ub) => ub.book_id);

    // Fetch books metadata
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("*")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books:", booksError);
      timer.end();
      return { success: false, error: "Failed to fetch books" };
    }

    // Get up_next array from profile (prioritized books)
    const upNextArray = profileResult.data?.up_next || [];
    const upNextSet = new Set(upNextArray);

    // Build result with books, metadata, and prioritization
    const orderedBooks: WantToReadBook[] = userBooks
      .map((ub) => {
        const book = books?.find((b) => b.id === ub.book_id);
        if (!book) return undefined;

        return {
          ...book,
          userBook: ub,
          date_added: ub.date_added,
          isPrioritized: upNextSet.has(ub.book_id),
        };
      })
      .filter((book): book is WantToReadBook => book !== undefined);

    // Calculate total page count
    const totalPageCount = orderedBooks.reduce(
      (sum, book) => sum + (book.page_count || 0),
      0
    );

    timer.end();
    return {
      success: true,
      books: orderedBooks,
      total: orderedBooks.length,
      totalPageCount,
    };
  } catch (error) {
    timer.end();
    console.error("Get want-to-read books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

