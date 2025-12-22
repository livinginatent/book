"use server";

import { cookies } from "next/headers";

import type { BookAction } from "@/components/ui/book/book-actions";
import { createClient } from "@/lib/supabase/server";
import type { ReadingStatus } from "@/types/database.types";

export interface BookActionResult {
  success: true;
  message: string;
}

export interface BookActionError {
  success: false;
  error: string;
}

/**
 * Map BookAction to ReadingStatus
 */
function mapActionToStatus(action: BookAction): ReadingStatus {
  const statusMap: Record<BookAction, ReadingStatus> = {
    "to-read": "want_to_read",
    "currently-reading": "currently_reading",
    "up-next": "up_next",
    "did-not-finish": "dnf",
  };
  return statusMap[action];
}

/**
 * Add a book to a user's reading list using user_books table
 */
export async function addBookToReadingList(
  bookId: string,
  action: BookAction
): Promise<BookActionResult | BookActionError> {
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

    const status = mapActionToStatus(action);

    // Check if book already exists in user_books
    const { data: existingUserBook } = await supabase
      .from("user_books")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (existingUserBook) {
      // If it exists and is already in the same status, return success
      if (existingUserBook.status === status) {
        return {
          success: false,
          error: `Book is already in your ${action.replace("-", " ")} list`,
        };
      }
      // If it exists in a different status, update it
      const { error: updateError } = await supabase
        .from("user_books")
        .update({
          status,
          date_started:
            status === "currently_reading" ? new Date().toISOString() : null,
          date_finished:
            status === "finished" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUserBook.id);

      if (updateError) {
        console.error("Error updating user_book:", updateError);
        return { success: false, error: "Failed to update reading list" };
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase.from("user_books").insert({
        user_id: user.id,
        book_id: bookId,
        status,
        date_added: new Date().toISOString(),
        date_started:
          action === "currently-reading" ? new Date().toISOString() : null,
      });

      if (insertError) {
        console.error("Error inserting user_book:", insertError);
        return { success: false, error: "Failed to add book to reading list" };
      }
    }

    // If adding to currently_reading, also create/update reading progress
    if (action === "currently-reading") {
      const { error: progressError } = await supabase
        .from("reading_progress")
        .upsert(
          {
            user_id: user.id,
            book_id: bookId,
            pages_read: 0,
          },
          {
            onConflict: "user_id,book_id",
          }
        );

      if (progressError) {
        // Log but don't fail - the book was still added to the list
        console.error("Error creating reading progress:", progressError);
      }
    }

    return {
      success: true,
      message: `Book added to ${action.replace("-", " ")}`,
    };
  } catch (error) {
    console.error("Add book to reading list error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Remove a book from a user's reading list using user_books table
 */
export async function removeBookFromReadingList(
  bookId: string,
  action: BookAction
): Promise<BookActionResult | BookActionError> {
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

    // Delete the user_book record
    const { error: deleteError } = await supabase
      .from("user_books")
      .delete()
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (deleteError) {
      console.error("Error deleting user_book:", deleteError);
      return { success: false, error: "Failed to remove book from list" };
    }

    return {
      success: true,
      message: `Book removed from ${action.replace("-", " ")}`,
    };
  } catch (error) {
    console.error("Remove book from reading list error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update a user's book status
 */
export async function updateBookStatus(
  bookId: string,
  status: ReadingStatus,
  dateFinished?: string | null
): Promise<BookActionResult | BookActionError> {
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

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set appropriate dates based on status
    if (status === "currently_reading") {
      updateData.date_started = new Date().toISOString();
      updateData.date_finished = null;
    } else if (status === "finished") {
      // Use provided dateFinished or default to today
      updateData.date_finished =
        dateFinished || new Date().toISOString();
    } else if (status === "paused") {
      // Keep date_started but don't set date_finished
      updateData.date_finished = null;
    } else if (status === "dnf") {
      // Did not finish - set finished date but keep status as dnf
      updateData.date_finished = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("user_books")
      .update(updateData)
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (updateError) {
      console.error("Update user_book status error:", updateError);
      return { success: false, error: "Failed to update book status" };
    }

    return {
      success: true,
      message: `Book status updated to ${status.replace("_", " ")}`,
    };
  } catch (error) {
    console.error("Update book status error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get user book statuses for multiple book IDs
 * Returns a map of book_id -> ReadingStatus
 */
export async function getUserBookStatuses(
  bookIds: string[]
): Promise<Record<string, ReadingStatus> | BookActionError> {
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

    if (bookIds.length === 0) {
      return { success: false, error: "No book IDs provided" };
    }

    // Fetch user_books for these book IDs
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("book_id, status")
      .eq("user_id", user.id)
      .in("book_id", bookIds);

    if (userBooksError) {
      console.error("Error fetching user_books:", userBooksError);
      return { success: false, error: "Failed to fetch user book statuses" };
    }

    // Create a map of book_id -> status
    const statusMap: Record<string, ReadingStatus> = {};
    for (const userBook of userBooks || []) {
      statusMap[userBook.book_id] = userBook.status;
    }

    return statusMap;
  } catch (error) {
    console.error("Get user book statuses error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Rate a book
 */
export async function rateBook(
  bookId: string,
  rating: number
): Promise<BookActionResult | BookActionError> {
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

    if (rating < 1 || rating > 5) {
      return { success: false, error: "Rating must be between 1 and 5" };
    }

    // Update rating - upsert to handle if book isn't in library yet
    const { error: updateError } = await supabase.from("user_books").upsert(
      {
        user_id: user.id,
        book_id: bookId,
        rating,
        status: "want_to_read", // Default status if book isn't in library
      },
      {
        onConflict: "user_id,book_id",
      }
    );

    if (updateError) {
      console.error("Update user_book rating error:", updateError);
      return { success: false, error: "Failed to rate book" };
    }

    return {
      success: true,
      message: `Book rated ${rating} stars`,
    };
  } catch (error) {
    console.error("Rate book error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
