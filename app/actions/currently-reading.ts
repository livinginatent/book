"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/types/database.types";

export interface CurrentlyReadingResult {
  success: true;
  books: Book[];
  total: number;
}

export interface CurrentlyReadingError {
  success: false;
  error: string;
}

/**
 * Get currently reading books for the authenticated user
 */
export async function getCurrentlyReadingBooks(): Promise<
  CurrentlyReadingResult | CurrentlyReadingError
> {
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

    // Get user's profile with currently_reading array
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("currently_reading")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const bookIds = profile.currently_reading || [];

    if (bookIds.length === 0) {
      return { success: true, books: [], total: 0 };
    }

    // Fetch books by IDs
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("*")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books:", booksError);
      return { success: false, error: "Failed to fetch books" };
    }

    // Maintain the order from the profile array
    const orderedBooks = bookIds
      .map((id) => books?.find((book) => book.id === id))
      .filter((book): book is Book => book !== undefined);

    return {
      success: true,
      books: orderedBooks,
      total: orderedBooks.length,
    };
  } catch (error) {
    console.error("Get currently reading books error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

