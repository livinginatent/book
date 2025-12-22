"use server";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export type JournalEntryType = "note" | "quote" | "prediction";

export interface JournalEntry {
  id: string;
  type: JournalEntryType;
  content: string;
  page?: number;
  createdAt: Date;
}

export interface JournalEntriesResult {
  success: true;
  entries: JournalEntry[];
}

export interface JournalEntriesError {
  success: false;
  error: string;
}

/**
 * Get journal entries for a book
 */
export async function getJournalEntries(
  bookId: string
): Promise<JournalEntriesResult | JournalEntriesError> {
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

    // Fetch journal entries
    const { data: entries, error: entriesError } = await supabase
      .from("reading_journal")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (entriesError) {
      console.error("Error fetching journal entries:", entriesError);
      return { success: false, error: "Failed to fetch journal entries" };
    }

    // Transform to component format
    const transformedEntries: JournalEntry[] = (entries || []).map((entry) => ({
      id: entry.id,
      type: entry.type as JournalEntryType,
      content: entry.content,
      page: entry.page || undefined,
      createdAt: new Date(entry.created_at),
    }));

    return {
      success: true,
      entries: transformedEntries,
    };
  } catch (error) {
    console.error("Get journal entries error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Create a new journal entry
 */
export async function createJournalEntry(
  bookId: string,
  type: JournalEntryType,
  content: string,
  page?: number
): Promise<{ success: true; entry: JournalEntry } | { success: false; error: string }> {
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

    // Insert journal entry
    const { data: entry, error: insertError } = await supabase
      .from("reading_journal")
      .insert({
        user_id: user.id,
        book_id: bookId,
        type,
        content,
        page: page || null,
      })
      .select()
      .single();

    if (insertError || !entry) {
      console.error("Error creating journal entry:", insertError);
      return { success: false, error: "Failed to create journal entry" };
    }

    return {
      success: true,
      entry: {
        id: entry.id,
        type: entry.type as JournalEntryType,
        content: entry.content,
        page: entry.page || undefined,
        createdAt: new Date(entry.created_at),
      },
    };
  } catch (error) {
    console.error("Create journal entry error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}


