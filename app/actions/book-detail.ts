"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Book, ReadingProgress, UserBook } from "@/types/database.types";

export interface BookDetail extends Book {
  progress?: ReadingProgress;
  userBook?: UserBook;
}

export interface BookDetailResult {
  success: true;
  book: BookDetail;
}

export interface BookDetailError {
  success: false;
  error: string;
}

/**
 * Get detailed information about a single book for the authenticated user
 */
export async function getBookDetail(
  bookId: string
): Promise<BookDetailResult | BookDetailError> {
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

    // Fetch the book
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      console.error("Error fetching book:", bookError);
      return { success: false, error: "Book not found" };
    }

    // Fetch user_book entry
    const { data: userBook, error: userBookError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (userBookError && userBookError.code !== "PGRST116") {
      // PGRST116 is "no rows returned", which is fine
      console.error("Error fetching user_book:", userBookError);
    }

    // Fetch reading progress
    const { data: progress, error: progressError } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      console.error("Error fetching reading progress:", progressError);
    }

    // Verify the book is currently being read
    if (!userBook || userBook.status !== "currently_reading") {
      return {
        success: false,
        error: "This book is not in your currently reading list",
      };
    }

    return {
      success: true,
      book: {
        ...book,
        progress: progress || undefined,
        userBook: userBook || undefined,
      },
    };
  } catch (error) {
    console.error("Get book detail error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


