"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { deleteReadingProgress } from "./reading-progress";

export interface RedemptionResult {
  success: true;
  message: string;
}

export interface RedemptionError {
  success: false;
  error: string;
}

/**
 * Give a DNF book another shot
 * Moves book to want_to_read, clears progress, but preserves notes as "Previous Attempt"
 */
export async function redeemDNFBook(
  bookId: string
): Promise<RedemptionResult | RedemptionError> {
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

    // Get current user_book to preserve notes
    const { data: userBook, error: fetchError } = await supabase
      .from("user_books")
      .select("notes")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (fetchError) {
      console.error("Error fetching user_book:", fetchError);
      return { success: false, error: "Failed to fetch book details" };
    }

    // Prepare notes with "Previous Attempt" prefix if notes exist
    let updatedNotes: string | null = null;
    if (userBook?.notes && userBook.notes.trim()) {
      const previousAttemptPrefix = "Previous Attempt: ";
      // Avoid duplicating the prefix if it already exists
      if (userBook.notes.startsWith(previousAttemptPrefix)) {
        updatedNotes = userBook.notes;
      } else {
        updatedNotes = `${previousAttemptPrefix}${userBook.notes}`;
      }
    }

    // Update book status to want_to_read and preserve notes
    const { error: updateError } = await supabase
      .from("user_books")
      .update({
        status: "want_to_read",
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (updateError) {
      console.error("Error updating book status:", updateError);
      return { success: false, error: "Failed to update book status" };
    }

    // Clear reading progress
    const progressResult = await deleteReadingProgress(bookId);
    if (!progressResult.success) {
      console.error("Error clearing reading progress:", progressResult.error);
      // Don't fail the whole operation if progress deletion fails
    }

    return {
      success: true,
      message: "Book moved to Want to Read. Give it another shot!",
    };
  } catch (error) {
    console.error("Redeem DNF book error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

