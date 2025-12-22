"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { ReadingFormat } from "@/types/database.types";

export interface UpdateReadingFormatResult {
  success: true;
}

export interface UpdateReadingFormatError {
  success: false;
  error: string;
}

/**
 * Update the reading format for a user's book
 */
export async function updateReadingFormat(
  bookId: string,
  format: ReadingFormat
): Promise<UpdateReadingFormatResult | UpdateReadingFormatError> {
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

    // Update the reading format
    const { error } = await supabase
      .from("user_books")
      .update({
        reading_format: format,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("book_id", bookId);

    if (error) {
      console.error("Error updating reading format:", error);
      return {
        success: false,
        error: "Failed to update reading format",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Update reading format error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

