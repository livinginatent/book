"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export interface UpNextBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

export interface UpNextResult {
  success: true;
  books: UpNextBook[];
}

export interface UpNextError {
  success: false;
  error: string;
}

/**
 * Get up-next books for the authenticated user
 */
export async function getUpNextBooks(): Promise<UpNextResult | UpNextError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Get user's up_next books
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "up_next")
      .order("date_added", { ascending: false })
      .limit(3);

    if (userBooksError) {
      console.error("Error fetching up_next books:", userBooksError);
      return { success: false, error: "Failed to fetch up-next books" };
    }

    if (!userBooks || userBooks.length === 0) {
      return { success: true, books: [] };
    }

    const bookIds = userBooks.map((ub) => ub.book_id);

    // Fetch books
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("*")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch books" };
    }

    // Transform to component format
    const transformedBooks: UpNextBook[] = (books || [])
      .map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authors?.join(", ") || "Unknown Author",
        cover:
          book.cover_url_medium ||
          book.cover_url_large ||
          book.cover_url_small ||
          "",
      }))
      .slice(0, 3); // Limit to 3 books

    return {
      success: true,
      books: transformedBooks,
    };
  } catch (error) {
    console.error("Get up-next books error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


