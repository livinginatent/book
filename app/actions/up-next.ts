"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { Book, UserBook } from "@/types/database.types";
import type { SubscriptionTier } from "@/types/database.types";

export interface UpNextQueueBook extends Book {
  userBook: UserBook;
}

export interface UpNextQueueResult {
  success: true;
  books: UpNextQueueBook[];
  canAdd: boolean;
  pageCount: number | null;
  dailyReadingGoal: number;
  subscriptionTier: SubscriptionTier;
}

export interface UpNextQueueError {
  success: false;
  error: string;
}

export interface UpdateQueueOrderResult {
  success: true;
  message: string;
}

export interface UpdateQueueOrderError {
  success: false;
  error: string;
}

export interface StartReadingNowResult {
  success: true;
  message: string;
}

export interface StartReadingNowError {
  success: false;
  error: string;
}

/**
 * Get up-next queue for the authenticated user
 * Fetches books from user_books joined with books where status is 'up_next'
 * Ordered by sort_order in ascending order
 * Validates subscription tier limits and returns canAdd flag
 */
export async function getUpNextQueue(): Promise<
  UpNextQueueResult | UpNextQueueError
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

    // Fetch profile to get subscription_tier and daily_reading_goal
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier, daily_reading_goal")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { success: false, error: "Failed to fetch user profile" };
    }

    const subscriptionTier: SubscriptionTier =
      (profile?.subscription_tier as SubscriptionTier) || "free";
    const dailyReadingGoal = profile?.daily_reading_goal || 40;

    // Fetch user_books with books joined, ordered by sort_order
    // Using Supabase PostgREST join syntax: books(*) joins on book_id foreign key
    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .eq("status", "up_next")
      .order("sort_order", { ascending: true });

    if (userBooksError) {
      console.error("Error fetching up_next books:", userBooksError);
      return { success: false, error: "Failed to fetch up-next queue" };
    }

    if (!userBooks || userBooks.length === 0) {
    return {
      success: true,
      books: [],
      canAdd: true,
      pageCount: null,
      dailyReadingGoal,
      subscriptionTier,
    };
    }

    // Determine limit based on subscription tier
    const limit = subscriptionTier === "bibliophile" ? 12 : 6;
    const currentCount = userBooks.length;
    const canAdd = currentCount < limit;

    // Transform the data - userBooks will have books nested
    const books: UpNextQueueBook[] = userBooks
      .map((ub: any) => {
        const book = ub.books as Book;
        if (!book) return null;

        return {
          ...book,
          userBook: {
            id: ub.id,
            user_id: ub.user_id,
            book_id: ub.book_id,
            status: ub.status,
            rating: ub.rating,
            reading_format: ub.reading_format,
            date_added: ub.date_added,
            date_started: ub.date_started,
            date_finished: ub.date_finished,
            notes: ub.notes,
            sort_order: ub.sort_order,
            created_at: ub.created_at,
            updated_at: ub.updated_at,
          },
        };
      })
      .filter((book): book is UpNextQueueBook => book !== null);

    // Calculate total page count
    const pageCount = books.reduce(
      (sum, book) => sum + (book.page_count || 0),
      0
    );

    return {
      success: true,
      books,
      canAdd,
      pageCount: pageCount > 0 ? pageCount : null,
      dailyReadingGoal,
      subscriptionTier,
    };
  } catch (error) {
    console.error("Get up-next queue error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update the sort order of books in the up-next queue
 * Performs a bulk update on user_books, setting sort_order to match the array index
 */
export async function updateQueueOrder(
  bookIds: string[]
): Promise<UpdateQueueOrderResult | UpdateQueueOrderError> {
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

    // Validate that all bookIds belong to the user and have 'up_next' status
    const { data: existingBooks, error: validationError } = await supabase
      .from("user_books")
      .select("id, book_id")
      .eq("user_id", user.id)
      .eq("status", "up_next")
      .in("book_id", bookIds);

    if (validationError) {
      console.error("Error validating books:", validationError);
      return { success: false, error: "Failed to validate books" };
    }

    if (!existingBooks || existingBooks.length !== bookIds.length) {
      return {
        success: false,
        error: "Some books are not in your up-next queue",
      };
    }

    // Create a map of book_id to user_books id for efficient lookup
    const bookIdToUserBookId = new Map<string, string>();
    for (const userBook of existingBooks) {
      bookIdToUserBookId.set(userBook.book_id, userBook.id);
    }

    // Perform bulk update - iterate through array and update sort_order
    const updates = bookIds.map((bookId, index) => {
      const userBookId = bookIdToUserBookId.get(bookId);
      if (!userBookId) {
        throw new Error(`Book ${bookId} not found in user_books`);
      }

      return supabase
        .from("user_books")
        .update({ sort_order: index })
        .eq("id", userBookId)
        .eq("user_id", user.id);
    });

    // Execute all updates in parallel
    const results = await Promise.all(updates);

    // Check for errors
    for (const result of results) {
      if (result.error) {
        console.error("Error updating sort order:", result.error);
        return {
          success: false,
          error: "Failed to update queue order",
        };
      }
    }

    return {
      success: true,
      message: "Queue order updated successfully",
    };
  } catch (error) {
    console.error("Update queue order error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface StartReadingNowResult {
  success: true;
  message: string;
}

export interface StartReadingNowError {
  success: false;
  error: string;
}

/**
 * Start reading a book from the up-next queue
 * Changes status to 'currently_reading', sets date_started, and clears sort_order
 */
export async function startReadingNow(
  bookId: string
): Promise<StartReadingNowResult | StartReadingNowError> {
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

    // Find the user_books record
    const { data: userBook, error: findError } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .eq("status", "up_next")
      .single();

    if (findError || !userBook) {
      return {
        success: false,
        error: "Book not found in your up-next queue",
      };
    }

    // Update the book status
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status: "currently_reading",
        date_started: now,
        sort_order: 0,
        updated_at: now,
      })
      .eq("id", userBook.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error starting book:", updateError);
      return {
        success: false,
        error: "Failed to start reading book",
      };
    }

    return {
      success: true,
      message: "Started reading!",
    };
  } catch (error) {
    console.error("Start reading now error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface MoveToUpNextResult {
  success: true;
  message: string;
}

export interface MoveToUpNextError {
  success: false;
  error: string;
}

/**
 * Move a book from paused (or other status) to up-next queue
 * Sets sort_order to max(sort_order) + 1 to add it at the end
 */
export async function moveToUpNext(
  bookId: string
): Promise<MoveToUpNextResult | MoveToUpNextError> {
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

    // Get the max sort_order from existing up_next books
    const { data: existingUpNext, error: maxError } = await supabase
      .from("user_books")
      .select("sort_order")
      .eq("user_id", user.id)
      .eq("status", "up_next")
      .order("sort_order", { ascending: false })
      .limit(1);

    if (maxError) {
      console.error("Error fetching max sort_order:", maxError);
      return { success: false, error: "Failed to fetch queue order" };
    }

    // Calculate new sort_order (max + 1, or 0 if no books exist)
    const newSortOrder =
      existingUpNext && existingUpNext.length > 0
        ? (existingUpNext[0].sort_order ?? 0) + 1
        : 0;

    // Find the user_books record for this book
    const { data: userBook, error: findError } = await supabase
      .from("user_books")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (findError || !userBook) {
      return {
        success: false,
        error: "Book not found in your reading list",
      };
    }

    // Update the book status to up_next with new sort_order
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status: "up_next",
        sort_order: newSortOrder,
        updated_at: now,
      })
      .eq("id", userBook.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error moving book to up-next:", updateError);
      return {
        success: false,
        error: "Failed to move book to up-next queue",
      };
    }

    return {
      success: true,
      message: "Book moved to up-next queue",
    };
  } catch (error) {
    console.error("Move to up-next error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}