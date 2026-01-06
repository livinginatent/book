"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface UpdateProfileResult {
  success: true;
  message: string;
}

export interface UpdateProfileError {
  success: false;
  error: string;
}

interface UpdateProfileInput {
  username?: string;
  display_name?: string;
  bio?: string;
}

/**
 * Sanitize text input by trimming whitespace and removing excessive spaces
 */
function sanitizeText(text: string | undefined | null): string | null {
  if (!text) return null;
  return text.trim().replace(/\s+/g, " ") || null;
}

/**
 * Update user profile in the profiles table
 */
export async function updateProfile(
  data: UpdateProfileInput
): Promise<UpdateProfileResult | UpdateProfileError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Check username uniqueness if username is being updated
    if (data.username !== undefined && data.username !== null) {
      const sanitizedUsername = data.username.trim().toLowerCase();
      
      if (sanitizedUsername.length === 0) {
        return { success: false, error: "Username cannot be empty" };
      }

      // Check if username is already taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", sanitizedUsername)
        .neq("id", user.id)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "not found" which is what we want
        console.error("Error checking username:", checkError);
        return { success: false, error: "Failed to check username availability" };
      }

      if (existingProfile) {
        return { success: false, error: "Username taken" };
      }
    }

    // Sanitize display_name and bio
    const sanitizedDisplayName = sanitizeText(data.display_name);
    const sanitizedBio = sanitizeText(data.bio);

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};

    if (data.username !== undefined) {
      updateData.username = data.username.trim().toLowerCase() || null;
    }

    if (data.display_name !== undefined) {
      updateData.display_name = sanitizedDisplayName;
    }

    if (data.bio !== undefined) {
      updateData.bio = sanitizedBio;
    }

    // If no fields to update, return early
    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No fields to update" };
    }

    // Update the profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return { success: false, error: "Failed to update profile" };
    }

    // Revalidate the settings page to refresh the UI
    revalidatePath("/settings");

    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface DeleteAccountResult {
  success: true;
  redirectTo: string;
}

export interface DeleteAccountError {
  success: false;
  error: string;
}

/**
 * Delete user account and all associated data
 * Deletes reading_sessions, user_books, reading_goals, profile, and auth user
 */
export async function deleteUserAccount(): Promise<
  DeleteAccountResult | DeleteAccountError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const userId = user.id;

    // Delete all user data in order (respecting foreign key constraints)
    // 1. Delete reading_sessions
    const { error: sessionsError } = await supabaseAdmin
      .from("reading_sessions")
      .delete()
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("Error deleting reading sessions:", sessionsError);
      return {
        success: false,
        error: "Failed to delete reading sessions",
      };
    }

    // 2. Delete user_books
    const { error: userBooksError } = await supabaseAdmin
      .from("user_books")
      .delete()
      .eq("user_id", userId);

    if (userBooksError) {
      console.error("Error deleting user books:", userBooksError);
      return {
        success: false,
        error: "Failed to delete user books",
      };
    }

    // 3. Delete reading_goals
    const { error: goalsError } = await supabaseAdmin
      .from("reading_goals")
      .delete()
      .eq("user_id", userId);

    if (goalsError) {
      console.error("Error deleting reading goals:", goalsError);
      return {
        success: false,
        error: "Failed to delete reading goals",
      };
    }

    // 4. Delete the profile (this will cascade from auth user deletion, but we'll delete it explicitly to be safe)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return {
        success: false,
        error: "Failed to delete profile",
      };
    }

    // 5. Delete the auth user (this will cascade delete the profile if it still exists)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteUserError) {
      console.error("Error deleting auth user:", deleteUserError);
      return {
        success: false,
        error: "Failed to delete user account",
      };
    }

    // Sign out the user (clear cookies)
    await supabase.auth.signOut();

    // Revalidate all paths
    revalidatePath("/", "layout");

    // Return success with redirect URL - client will handle redirect
    return { success: true, redirectTo: "/" };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface ChangePasswordResult {
  success: true;
  message: string;
}

export interface ChangePasswordError {
  success: false;
  error: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change user password
 * Requires current password for verification
 */
export async function changePassword(
  data: ChangePasswordInput
): Promise<ChangePasswordResult | ChangePasswordError> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: data.currentPassword,
    });

    if (verifyError) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Validate new password matches confirmation
    if (data.newPassword !== data.confirmPassword) {
      return { success: false, error: "New passwords do not match" };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (updateError) {
      if (updateError.message.includes("same password")) {
        return {
          success: false,
          error: "New password must be different from your current password",
        };
      }
      return { success: false, error: updateError.message };
    }

    // Revalidate the settings page
    revalidatePath("/settings");

    return { success: true, message: "Password changed successfully" };
  } catch (error) {
    console.error("Error in changePassword:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface ExportLibraryResult {
  success: true;
  fileName: string;
  csv: string;
}

export interface ExportLibraryError {
  success: false;
  error: string;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str === "") return "";
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function exportUserLibrary(): Promise<
  ExportLibraryResult | ExportLibraryError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const { data: userBooks, error: userBooksError } = await supabase
      .from("user_books")
      .select("*")
      .eq("user_id", user.id);

    if (userBooksError) {
      console.error("Error fetching user_books for export:", userBooksError);
      return { success: false, error: "Failed to load your library" };
    }

    const safeUserBooks = userBooks ?? [];

    const bookIds = Array.from(
      new Set(safeUserBooks.map((ub) => ub.book_id))
    ).filter(Boolean);

    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("*")
      .in("id", bookIds);

    if (booksError) {
      console.error("Error fetching books for export:", booksError);
      return { success: false, error: "Failed to load book details" };
    }

    const bookMap = new Map<string, (typeof books)[number]>();
    for (const book of books || []) {
      bookMap.set(book.id, book);
    }

    const headers = [
      "Title",
      "Authors",
      "Status",
      "Rating",
      "Date Added",
      "Date Started",
      "Date Finished",
      "Page Count",
      "ISBN-10",
      "ISBN-13",
      "Language",
    ] as const;

    const lines: string[] = [];
    lines.push(headers.join(","));

    for (const ub of safeUserBooks) {
      const book = bookMap.get(ub.book_id);

      const rowValues: Record<(typeof headers)[number], string | number | null> =
        {
          Title: book?.title ?? "",
          Authors: book?.authors?.join(", ") ?? "",
          Status: ub.status,
          Rating: ub.rating ?? null,
          "Date Added": ub.date_added,
          "Date Started": ub.date_started,
          "Date Finished": ub.date_finished,
          "Page Count": book?.page_count ?? null,
          "ISBN-10": (book?.isbn_10 ?? []).join(", "),
          "ISBN-13": (book?.isbn_13 ?? []).join(", "),
          Language: book?.language ?? "",
        };

      const line = headers
        .map((header) => escapeCsvValue(rowValues[header]))
        .join(",");

      lines.push(line);
    }

    const csv = lines.join("\n");
    const today = new Date().toISOString().slice(0, 10);
    const fileName = `bookly-library-${today}.csv`;

    return { success: true, fileName, csv };
  } catch (error) {
    console.error("Error in exportUserLibrary:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to export your library",
    };
  }
}

export interface ResetLibraryResult {
  success: true;
  message: string;
}

export interface ResetLibraryError {
  success: false;
  error: string;
}

export async function resetLibrary(): Promise<
  ResetLibraryResult | ResetLibraryError
> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be logged in" };
    }

    const userId = user.id;

    // Delete reading-related data but keep profile and goals
    const { error: sessionsError } = await supabaseAdmin
      .from("reading_sessions")
      .delete()
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("Error deleting reading_sessions for reset:", sessionsError);
      return {
        success: false,
        error: "Failed to delete reading sessions",
      };
    }

    const { error: journalError } = await supabaseAdmin
      .from("reading_journal")
      .delete()
      .eq("user_id", userId);

    if (journalError) {
      console.error("Error deleting reading_journal for reset:", journalError);
      return {
        success: false,
        error: "Failed to delete reading journal entries",
      };
    }

    const { error: progressError } = await supabaseAdmin
      .from("reading_progress")
      .delete()
      .eq("user_id", userId);

    if (progressError) {
      console.error("Error deleting reading_progress for reset:", progressError);
      return {
        success: false,
        error: "Failed to delete reading progress",
      };
    }

    const { error: userBooksError } = await supabaseAdmin
      .from("user_books")
      .delete()
      .eq("user_id", userId);

    if (userBooksError) {
      console.error("Error deleting user_books for reset:", userBooksError);
      return {
        success: false,
        error: "Failed to delete your books",
      };
    }

    // Clear legacy shelf arrays on profile but keep goals/profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        want_to_read: [],
        currently_reading: [],
        up_next: [],
        did_not_finish: [],
      })
      .eq("id", userId);

    if (profileError) {
      console.error("Error clearing profile shelf arrays on reset:", profileError);
      return {
        success: false,
        error: "Failed to clean up your profile shelves",
      };
    }

    revalidatePath("/settings/data-migration");

    return {
      success: true,
      message: "Your library has been reset. Your profile and goals are intact.",
    };
  } catch (error) {
    console.error("Error in resetLibrary:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to reset your library",
    };
  }
}

