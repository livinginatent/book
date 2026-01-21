"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
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
    "want-to-read": "want_to_read",
    "currently-reading": "currently_reading",
    "up-next": "up_next",
    "did-not-finish": "dnf",
    paused: "paused",
    finished: "finished",
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
 * Options for updating book status with optional dates
 */
export interface UpdateBookStatusOptions {
  dateStarted?: string | null;
  dateFinished?: string | null;
  notes?: string | null;
  createSession?: boolean;
}

/**
 * Check if a book has any reading sessions
 */
export async function hasReadingSessions(
  bookId: string
): Promise<
  { success: true; hasSessions: boolean; pageCount: number } | BookActionError
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

    // Get book page_count
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("page_count")
      .eq("id", bookId)
      .single();

    if (bookError || !book) {
      console.error("Error fetching book:", bookError);
      return { success: false, error: "Book not found" };
    }

    const pageCount = book.page_count || 0;

    // Check if there are any reading sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("reading_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .limit(1);

    if (sessionsError) {
      console.error("Error fetching reading sessions:", sessionsError);
      return { success: false, error: "Failed to fetch reading sessions" };
    }

    return {
      success: true,
      hasSessions: (sessions || []).length > 0,
      pageCount,
    };
  } catch (error) {
    console.error("Has reading sessions error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Internal helper: Finish a book by bookId (skips redundant userBook lookup)
 * Used by updateBookStatus to avoid extra DB round-trip
 */
async function finishBookByBookId(
  supabase: SupabaseClient,
  userId: string,
  bookId: string,
  finishDate: string,
  dateStarted?: string | null,
  createSession: boolean = true
): Promise<BookActionResult | BookActionError> {
  try {
    // Fetch book page_count and reading sessions in PARALLEL
    const [bookResult, sessionsResult] = await Promise.all([
      supabase
        .from("books")
        .select("page_count")
        .eq("id", bookId)
        .single(),
      // Only fetch sessions if we need to create one
      createSession
        ? supabase
            .from("reading_sessions")
            .select("pages_read")
            .eq("user_id", userId)
            .eq("book_id", bookId)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (bookResult.error || !bookResult.data) {
      console.error("Error fetching book:", bookResult.error);
      return { success: false, error: "Book not found" };
    }

    const pageCount = bookResult.data.page_count || 0;

    // Calculate remaining pages only if createSession is true
    let remainingPages = 0;
    if (createSession && sessionsResult.data) {
      const totalPagesRead = sessionsResult.data.reduce(
        (sum, session) => sum + (session.pages_read || 0),
        0
      );
      remainingPages = pageCount - totalPagesRead;
    }

    // Normalize finishDate to YYYY-MM-DD format
    const finishDateObj = new Date(finishDate);
    const normalizedFinishDate = finishDateObj.toISOString().split("T")[0];

    // Update user_books status to finished
    const updateData: Record<string, unknown> = {
      status: "finished",
      date_finished: finishDate,
      updated_at: new Date().toISOString(),
    };

    if (dateStarted) {
      updateData.date_started = dateStarted;
    }

    const { error: updateError } = await supabase
      .from("user_books")
      .update(updateData)
      .eq("user_id", userId)
      .eq("book_id", bookId);

    if (updateError) {
      console.error("Error updating user_book:", updateError);
      return { success: false, error: "Failed to update book status" };
    }

    // If remaining_pages > 0 and createSession is true, insert a reading session
    if (remainingPages > 0 && createSession) {
      // Fire-and-forget: Don't wait for session creation
      supabase
        .from("reading_sessions")
        .insert({
          user_id: userId,
          book_id: bookId,
          pages_read: remainingPages,
          session_date: normalizedFinishDate,
          started_at: new Date(finishDate).toISOString(),
          ended_at: new Date(finishDate).toISOString(),
        })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            console.error("Error creating reading session:", sessionError);
          }
        });
    }

    return {
      success: true,
      message: "Book marked as finished",
    };
  } catch (error) {
    console.error("Finish book error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Finish a book with automatic session backfill
 * Calculates remaining pages and creates a reading session if needed
 *
 * @param userBookId - The ID of the user_books record
 * @param finishDate - The date the book was finished (ISO string)
 * @param dateStarted - Optional start date (ISO string)
 * @param createSession - Whether to create a reading session for remaining pages (default: true)
 */
export async function finishBook(
  userBookId: string,
  finishDate: string,
  dateStarted?: string | null,
  createSession: boolean = true
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

    // Step 1: Get user_book to get book_id and verify ownership
    const { data: userBook, error: userBookError } = await supabase
      .from("user_books")
      .select("id, book_id, user_id")
      .eq("id", userBookId)
      .eq("user_id", user.id) // Verify ownership
      .single();

    if (userBookError || !userBook) {
      console.error("Error fetching user_book:", userBookError);
      return { success: false, error: "Book not found in your library" };
    }

    const bookId = userBook.book_id;

    // Step 2 & 3: Fetch book page_count and reading sessions in PARALLEL
    const [bookResult, sessionsResult] = await Promise.all([
      supabase
        .from("books")
        .select("page_count")
        .eq("id", bookId)
        .single(),
      // Only fetch sessions if we need to create one
      createSession
        ? supabase
            .from("reading_sessions")
            .select("pages_read")
            .eq("user_id", user.id)
            .eq("book_id", bookId)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (bookResult.error || !bookResult.data) {
      console.error("Error fetching book:", bookResult.error);
      return { success: false, error: "Book not found" };
    }

    const pageCount = bookResult.data.page_count || 0;

    // Calculate remaining pages only if createSession is true
    let remainingPages = 0;
    if (createSession && sessionsResult.data) {
      const totalPagesRead = sessionsResult.data.reduce(
        (sum, session) => sum + (session.pages_read || 0),
        0
      );
      remainingPages = pageCount - totalPagesRead;
    }

    // Normalize finishDate to YYYY-MM-DD format
    const finishDateObj = new Date(finishDate);
    const normalizedFinishDate = finishDateObj.toISOString().split("T")[0];

    // Update user_books status to finished
    const updateData: Record<string, unknown> = {
      status: "finished",
      date_finished: finishDate,
      updated_at: new Date().toISOString(),
    };

    if (dateStarted) {
      updateData.date_started = dateStarted;
    }

    const { error: updateError } = await supabase
      .from("user_books")
      .update(updateData)
      .eq("id", userBook.id);

    if (updateError) {
      console.error("Error updating user_book:", updateError);
      return { success: false, error: "Failed to update book status" };
    }

    // If remaining_pages > 0 and createSession is true, insert a reading session
    if (remainingPages > 0 && createSession) {
      // Fire-and-forget: Don't wait for session creation
      supabase
        .from("reading_sessions")
        .insert({
          user_id: user.id,
          book_id: bookId,
          pages_read: remainingPages,
          session_date: normalizedFinishDate,
          started_at: new Date(finishDate).toISOString(),
          ended_at: new Date(finishDate).toISOString(),
        })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            console.error("Error creating reading session:", sessionError);
          }
        });
    }

    return {
      success: true,
      message: "Book marked as finished",
    };
  } catch (error) {
    console.error("Finish book error:", error);
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
  dateFinishedOrOptions?: string | null | UpdateBookStatusOptions
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

    // Parse options - support both old signature and new options object
    let dateStarted: string | null | undefined;
    let dateFinished: string | null | undefined;
    let notes: string | null | undefined;
    let createSession: boolean | undefined;

    if (
      typeof dateFinishedOrOptions === "object" &&
      dateFinishedOrOptions !== null
    ) {
      dateStarted = dateFinishedOrOptions.dateStarted;
      dateFinished = dateFinishedOrOptions.dateFinished;
      notes = dateFinishedOrOptions.notes;
      createSession = dateFinishedOrOptions.createSession;
    } else {
      dateFinished = dateFinishedOrOptions;
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set appropriate dates based on status
    if (status === "currently_reading") {
      updateData.date_started = dateStarted || new Date().toISOString();
      updateData.date_finished = null;
    } else if (status === "finished") {
      // Use the optimized finishBookByBookId function which handles backfill
      // Default to creating session if not specified (backward compatibility)
      const finishDate = dateFinished || new Date().toISOString();
      const shouldCreateSession =
        createSession !== undefined ? createSession : true;
      return finishBookByBookId(
        supabase,
        user.id,
        bookId,
        finishDate,
        dateStarted,
        shouldCreateSession
      );
    } else if (status === "paused") {
      // Keep date_started but don't set date_finished
      updateData.date_finished = null;
    } else if (status === "dnf") {
      // Did not finish - ensure there is no finished date
      updateData.date_finished = null;
      // Always set notes for DNF status (even if null/undefined)
      if (notes !== undefined && notes !== null && typeof notes === "string") {
        // notes is a non-empty string, trim it
        const trimmed = notes.trim();
        updateData.notes = trimmed || null;
      } else {
        // notes is undefined, null, or empty - set to null
        updateData.notes = null;
      }
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

/**
 * Add a book to the user's up_next array in profiles table
 */
export async function addToUpNext(
  bookId: string
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

    // Get current profile to fetch existing up_next array
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("up_next")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: "Failed to fetch profile" };
    }

    const currentUpNext = profile?.up_next || [];

    // Check if book is already in up_next
    if (currentUpNext.includes(bookId)) {
      return {
        success: false,
        error: "Book is already in your up next list",
      };
    }

    // Add book to up_next array
    const updatedUpNext = [...currentUpNext, bookId];

    // Update profile with new up_next array
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ up_next: updatedUpNext })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating up_next:", updateError);
      return { success: false, error: "Failed to add book to up next" };
    }

    return {
      success: true,
      message: "Book added to up next",
    };
  } catch (error) {
    console.error("Add to up next error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Remove a book from the user's up_next array in profiles table
 */
export async function removeFromUpNext(
  bookId: string
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

    // Get current profile to fetch existing up_next array
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("up_next")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: "Failed to fetch profile" };
    }

    const currentUpNext = profile?.up_next || [];

    // Remove book from up_next array
    const updatedUpNext = currentUpNext.filter((id: string) => id !== bookId);

    // Update profile with new up_next array
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ up_next: updatedUpNext })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating up_next:", updateError);
      return { success: false, error: "Failed to remove book from up next" };
    }

    return {
      success: true,
      message: "Book removed from up next",
    };
  } catch (error) {
    console.error("Remove from up next error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
