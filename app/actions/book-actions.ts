"use server";

import { cookies } from "next/headers";

import type { BookAction } from "@/components/ui/book-actions";
import { createClient } from "@/lib/supabase/server";

export interface BookActionResult {
  success: true;
  message: string;
}

export interface BookActionError {
  success: false;
  error: string;
}

/**
 * Add a book to a user's reading list
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

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    // Map action to profile field
    const fieldMap: Record<
      BookAction,
      "want_to_read" | "currently_reading" | "up_next" | "did_not_finish"
    > = {
      "to-read": "want_to_read",
      "currently-reading": "currently_reading",
      "up-next": "up_next",
      "did-not-finish": "did_not_finish",
    };

    const field = fieldMap[action];
    const currentArray = (profile[field] as string[]) || [];

    // Check if book is already in the list
    if (currentArray.includes(bookId)) {
      return {
        success: false,
        error: `Book is already in your ${action.replace("-", " ")} list`,
      };
    }

    // Remove book from other lists first (a book can only be in one list at a time)
    const allFields: Array<
      "want_to_read" | "currently_reading" | "up_next" | "did_not_finish"
    > = ["want_to_read", "currently_reading", "up_next", "did_not_finish"];

    const updates: {
      want_to_read?: string[];
      currently_reading?: string[];
      up_next?: string[];
      did_not_finish?: string[];
    } = {};

    // Remove from other lists
    for (const otherField of allFields) {
      if (otherField !== field) {
        const otherArray = (profile[otherField] as string[]) || [];
        updates[otherField] = otherArray.filter((id) => id !== bookId);
      }
    }

    // Add to the selected list
    updates[field] = [...currentArray, bookId];

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (updateError) {
      console.error("Update profile error:", updateError);
      return { success: false, error: "Failed to update reading list" };
    }

    // If adding to currently_reading, also create a reading progress entry
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
 * Remove a book from a user's reading list
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

    // Map action to profile field
    const fieldMap: Record<
      BookAction,
      "want_to_read" | "currently_reading" | "up_next" | "did_not_finish"
    > = {
      "to-read": "want_to_read",
      "currently-reading": "currently_reading",
      "up-next": "up_next",
      "did-not-finish": "did_not_finish",
    };

    const field = fieldMap[action];

    // Get current array
    const { data: profile } = await supabase
      .from("profiles")
      .select(field)
      .eq("id", user.id)
      .single();

    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    const currentArray = ((profile as Record<string, string[]>)[field] ||
      []) as string[];
    const updatedArray = currentArray.filter((id) => id !== bookId);

    // Update profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ [field]: updatedArray })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update profile error:", updateError);
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
