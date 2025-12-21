"use server";

import { cookies } from "next/headers";
import Papa from "papaparse";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchAndNormalizeBooks } from "@/lib/open-library";
import type { Book, BookInsert } from "@/types/database.types";

export type GoodreadsShelf = "read" | "currently-reading" | "to-read";

export type GoodreadsImportRow = {
  id: string;
  title: string;
  author: string;
  isbn13: string | null;
  rating: number;
  shelf: GoodreadsShelf;
  dateAdded: string;
  dateRead: string | null;
  pageCount: number | null;
};

export type ParsedBook = GoodreadsImportRow & {
  selected: boolean;
  coverUrl?: string;
  foundInDb?: boolean;
  bookId?: string;
};

export interface ParseResult {
  success: true;
  books: ParsedBook[];
  total: number;
}

export interface ParseError {
  success: false;
  error: string;
}

export interface ImportProgress {
  current: number;
  total: number;
  currentBook?: string;
}

export interface ImportResult {
  success: true;
  imported: number;
  failed: number;
  message: string;
}

export interface ImportError {
  success: false;
  error: string;
}

/**
 * Parse a Goodreads CSV export file
 */
export async function parseGoodreadsCSV(
  formData: FormData
): Promise<ParseResult | ParseError> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const csvText = await file.text();

    return new Promise<ParseResult | ParseError>((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Clean the ISBN formulas (e.g., ="9781501139239" -> 9781501139239)
          const cleanISBN = (val: string) => {
            if (!val) return null;
            const cleaned = val.replace(/[^0-9]/g, "");
            return cleaned.length > 0 ? cleaned : null;
          };

          // Map Goodreads "Exclusive Shelf" to our shelf type
          const mapShelf = (shelf: string): GoodreadsShelf => {
            if (shelf === "currently-reading") return "currently-reading";
            if (shelf === "to-read") return "to-read";
            return "read"; // Default/Read
          };

          const rows = results.data as Record<string, string>[];
          const transformedData: ParsedBook[] = rows
            .filter((row) => row["Title"]) // Filter out empty rows
            .map((row, index) => ({
              id: `gr-${index}-${Date.now()}`,
              title: row["Title"] || "",
              author: row["Author"] || "",
              isbn13: cleanISBN(row["ISBN13"]),
              rating: parseInt(row["My Rating"]) || 0,
              shelf: mapShelf(row["Exclusive Shelf"]),
              dateAdded: row["Date Added"] || new Date().toISOString(),
              dateRead: row["Date Read"] || null,
              pageCount: parseInt(row["Number of Pages"]) || null,
              selected: true,
              coverUrl: undefined,
              foundInDb: false,
            }));

          resolve({
            success: true,
            books: transformedData,
            total: transformedData.length,
          });
        },
        error: (error: Error) => {
          resolve({ success: false, error: error.message });
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse CSV",
    };
  }
}

/**
 * Search for a book by title and author, or ISBN
 */
async function findOrCreateBook(
  parsedBook: ParsedBook
): Promise<Book | null> {
  try {
    // First, try to find by ISBN if available
    if (parsedBook.isbn13) {
      const { data: existingBooks, error: isbnError } = await supabaseAdmin
        .from("books")
        .select("*")
        .contains("isbn_13", [parsedBook.isbn13])
        .limit(1);

      if (isbnError) {
        console.error("Error searching by ISBN:", isbnError);
      } else if (existingBooks && existingBooks.length > 0) {
        return existingBooks[0];
      }
    }

    // Try to find by title and author in local DB
    const searchQuery = `${parsedBook.title} ${parsedBook.author}`;
    const { data: localBooks } = await supabaseAdmin
      .from("books")
      .select("*")
      .ilike("title", `%${parsedBook.title}%`)
      .limit(1);

    if (localBooks && localBooks.length > 0) {
      return localBooks[0];
    }

    // Search Open Library
    const { books: olBooks } = await searchAndNormalizeBooks(searchQuery, {
      limit: 1,
    });

    if (olBooks.length === 0) {
      return null;
    }

    const olBook = olBooks[0];

    // Save to database
    const bookInsert: BookInsert = {
      open_library_id: olBook.openLibraryId,
      open_library_edition_id: olBook.openLibraryEditionId ?? null,
      title: olBook.title,
      subtitle: olBook.subtitle ?? null,
      authors: olBook.authors,
      description: olBook.description ?? null,
      subjects: olBook.subjects,
      publish_date: olBook.publishDate ?? null,
      publishers: olBook.publishers,
      isbn_10: olBook.isbn10.length > 0 ? olBook.isbn10 : null,
      isbn_13: olBook.isbn13.length > 0 ? olBook.isbn13 : null,
      page_count: parsedBook.pageCount || olBook.pageCount || null,
      cover_url_small: olBook.coverUrlSmall ?? null,
      cover_url_medium: olBook.coverUrlMedium ?? null,
      cover_url_large: olBook.coverUrlLarge ?? null,
      language: olBook.language ?? null,
    };

    const { data: savedBooks, error } = await supabaseAdmin
      .from("books")
      .upsert(bookInsert, { onConflict: "open_library_id" })
      .select();

    if (error) {
      console.error("Error saving book to database:", error);
      console.error("Book data:", { title: parsedBook.title, author: parsedBook.author });
      return null;
    }

    if (!savedBooks || savedBooks.length === 0) {
      console.error("Book upsert succeeded but no data returned");
      return null;
    }

    return savedBooks[0];
  } catch (error) {
    console.error("Error finding/creating book:", error);
    return null;
  }
}

/**
 * Add a book to the user's reading list
 */
async function addBookToUserList(
  userId: string,
  bookId: string,
  shelf: GoodreadsShelf,
  pagesRead?: number | null,
  totalPages?: number | null
): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Map shelf to profile field
    const shelfFieldMap: Record<GoodreadsShelf, string> = {
      read: "want_to_read", // We'll store read books in a separate flow or use finished status
      "currently-reading": "currently_reading",
      "to-read": "want_to_read",
    };

    const field = shelfFieldMap[shelf];

    // Get current profile - select all fields to match the working pattern in book-actions.ts
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile or profile not found:", profileError);
      return false;
    }

    // Access the field directly from the profile object
    const currentArray = ((profile as Record<string, string[]>)[field] || []) as string[];

    // Check if already in list
    if (currentArray.includes(bookId)) {
      return true; // Already exists, consider success
    }

    // Add to list
    const { error: updateError, data: updatedProfile } = await supabase
      .from("profiles")
      .update({ [field]: [...currentArray, bookId] })
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile with book:", updateError);
      console.error("Update data:", { field, bookId, userId, currentArrayLength: currentArray.length });
      return false;
    }

    // Verify the update succeeded
    if (!updatedProfile) {
      console.error("Profile update returned no data");
      return false;
    }

    const updatedArray = (updatedProfile as Record<string, string[]>)[field] as string[];
    if (!updatedArray || !updatedArray.includes(bookId)) {
      console.error("Book was not added to profile array after update");
      console.error("Expected array to include:", bookId);
      console.error("Actual array:", updatedArray);
      return false;
    }

    // If currently reading, create reading progress
    if (shelf === "currently-reading") {
      const { error: progressError } = await supabase.from("reading_progress").upsert(
        {
          user_id: userId,
          book_id: bookId,
          pages_read: pagesRead || 0,
        },
        { onConflict: "user_id,book_id" }
      );

      if (progressError) {
        console.error("Error creating reading progress:", progressError);
        // Don't fail the whole operation if progress creation fails
      }
    }

    return true;
  } catch (error) {
    console.error("Error adding book to user list:", error);
    return false;
  }
}

/**
 * Import selected books from Goodreads
 */
export async function importGoodreadsBooks(
  books: ParsedBook[]
): Promise<ImportResult | ImportError> {
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

    const selectedBooks = books.filter((b) => b.selected);
    let imported = 0;
    let failed = 0;

    for (const parsedBook of selectedBooks) {
      try {
        // Find or create the book in our database
        const book = await findOrCreateBook(parsedBook);

        if (!book) {
          console.error(`Failed to find or create book: ${parsedBook.title} by ${parsedBook.author}`);
          failed++;
          continue;
        }

        // Add to user's reading list based on shelf
        const added = await addBookToUserList(
          user.id,
          book.id,
          parsedBook.shelf,
          null, // pagesRead - would need to track this separately
          parsedBook.pageCount || book.page_count
        );

        if (added) {
          imported++;
        } else {
          console.error(`Failed to add book to user list: ${parsedBook.title} (${book.id})`);
          failed++;
        }
      } catch (error) {
        console.error(`Error importing book ${parsedBook.title}:`, error);
        failed++;
      }
    }

    return {
      success: true,
      imported,
      failed,
      message: `Successfully imported ${imported} books${failed > 0 ? `, ${failed} failed` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
