"use server";

import { cookies } from "next/headers";
import Papa from "papaparse";

import { searchAndNormalizeBooks } from "@/lib/open-library";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Book, BookInsert } from "@/types/database.types";

export type ReadingStatus =
  | "want_to_read"
  | "currently_reading"
  | "finished"
  | "did_not_finish"
  | "up_next";

export type GoodreadsShelf =
  | "read"
  | "currently-reading"
  | "to-read"
  | "did-not-finish"
  | "up-next"
  | "want-to-read";
export type GoodreadsImportRow = {
  id: string;
  title: string;
  author: string;
  isbn13: string | null;
  rating: number;
  shelf: GoodreadsShelf;
  dateAdded: string | null;
  dateRead: string | null;
  pageCount: number | null;
};

// Update your ParsedBook type to use the correct enum
export type ParsedBook = GoodreadsImportRow & {
  selected: boolean;
  coverUrl?: string;
  foundInDb?: boolean;
  bookId?: string;
  mappedStatus?: ReadingStatus; // Add this for clarity
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



function mapGoodreadsShelfToStatus(shelf: string): ReadingStatus {
  if (!shelf) return "want_to_read";

  const normalized = shelf.toLowerCase().trim();

  // Comprehensive mapping of all Goodreads shelf variations to database enum values
  const shelfMap: Record<string, ReadingStatus> = {
    // Finished/Read variations -> "finished"
    read: "finished",
    finished: "finished",
    completed: "finished",

    // Currently reading variations -> "currently_reading"
    "currently-reading": "currently_reading",
    "currently reading": "currently_reading",
    currently_reading: "currently_reading",
    reading: "currently_reading",
    "in-progress": "currently_reading",
    "in progress": "currently_reading",

    // Want to read variations -> "want_to_read"
    "to-read": "want_to_read",
    "to read": "want_to_read",
    "want to read": "want_to_read",
    "want-to-read": "want_to_read",
    want_to_read: "want_to_read",
    wishlist: "want_to_read",
    tbr: "want_to_read",

    // Did not finish variations -> "did_not_finish"
    dnf: "did_not_finish",
    "did-not-finish": "did_not_finish",
    "did not finish": "did_not_finish",
    did_not_finish: "did_not_finish",
    abandoned: "did_not_finish",
    "gave-up": "did_not_finish",

    // Up next variations -> "up_next"
    "up-next": "up_next",
    "up next": "up_next",
    up_next: "up_next",
    next: "up_next",
    queue: "up_next",
  };

  return shelfMap[normalized] || "want_to_read";
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
          const cleanISBN = (val: string) => {
            if (!val) return null;
            const cleaned = val.replace(/[^0-9]/g, "");
            return cleaned.length > 0 ? cleaned : null;
          };

          const parseDate = (val: string) => {
            if (!val) return null;
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : date.toISOString();
          };

          const rows = results.data as Record<string, string>[];
          const transformedData: ParsedBook[] = rows
            .filter((row) => row["Title"])
            .map((row, index) => {
              const rawShelf = row["Exclusive Shelf"] || "";
              const shelf = rawShelf.toLowerCase().trim() as GoodreadsShelf;
              const mappedStatus = mapGoodreadsShelfToStatus(rawShelf);

              return {
                id: `gr-${index}-${Date.now()}`,
                title: row["Title"] || "",
                author: row["Author"] || "",
                isbn13: cleanISBN(row["ISBN13"]),
                rating: parseInt(row["My Rating"]) || 0,
                shelf: shelf || "to-read",
                dateAdded: parseDate(row["Date Added"]),
                dateRead: parseDate(row["Date Read"]),
                pageCount: parseInt(row["Number of Pages"]) || null,
                selected: true,
                coverUrl: undefined,
                foundInDb: false,
                mappedStatus, // Store the mapped status for later use
              };
            });

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
 * (Kept largely the same, just ensured robust error handling)
 */
async function findOrCreateBook(parsedBook: ParsedBook): Promise<Book | null> {
  try {
    // 1. Try to find by ISBN in DB
    if (parsedBook.isbn13) {
      const { data: existingBooks } = await supabaseAdmin
        .from("books")
        .select("*")
        .contains("isbn_13", [parsedBook.isbn13])
        .limit(1);

      if (existingBooks && existingBooks.length > 0) {
        return existingBooks[0];
      }
    }

    // 2. Try to find by title/author in DB
    const { data: localBooks } = await supabaseAdmin
      .from("books")
      .select("*")
      .ilike("title", `%${parsedBook.title}%`)
      .limit(1);

    if (localBooks && localBooks.length > 0) {
      // Basic fuzzy match check - if we have author info, check it vaguely
      const localBook = localBooks[0];
      // You might want to add author checking logic here if titles are generic
      return localBook;
    }

    // 3. Search Open Library
    const searchQuery = `${parsedBook.title} ${parsedBook.author}`;
    const { books: olBooks } = await searchAndNormalizeBooks(searchQuery, {
      limit: 1,
    });

    if (olBooks.length === 0) {
      return null;
    }

    const olBook = olBooks[0];

    // 4. Save to database
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
      console.error("Error saving book:", error);
      return null;
    }

    return savedBooks?.[0] || null;
  } catch (error) {
    console.error("Error finding/creating book:", error);
    return null;
  }
}

/**
 * Upsert a book record into user_books
 */
async function upsertUserBook(
  userId: string,
  bookId: string,
  parsedBook: ParsedBook
): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Use the pre-mapped status from parsing, or map it again as fallback
    const status =
      parsedBook.mappedStatus || mapGoodreadsShelfToStatus(parsedBook.shelf);

    // Validate the status is a valid enum value
    const validStatuses: ReadingStatus[] = [
      "want_to_read",
      "currently_reading",
      "finished",
      "did_not_finish",
      "up_next",
    ];

    if (!validStatuses.includes(status)) {
      console.error(
        `Invalid status after mapping: ${status} from shelf: ${parsedBook.shelf}`
      );
      return false;
    }

    // Prepare the upsert payload
    const payload: any = {
      user_id: userId,
      book_id: bookId,
      status: status,
      rating: parsedBook.rating > 0 ? parsedBook.rating : null,
      updated_at: new Date().toISOString(),
    };

    if (parsedBook.dateAdded) payload.date_added = parsedBook.dateAdded;
    if (parsedBook.dateRead) payload.date_finished = parsedBook.dateRead;

    console.log(
      `Upserting book: ${parsedBook.title}, original shelf: ${parsedBook.shelf}, mapped status: ${status}`
    );

    // Use upsert with explicit conflict resolution
    // This will update existing rows or insert new ones
    const { error } = await supabase.from("user_books").upsert(payload, {
      onConflict: "user_id,book_id",
      ignoreDuplicates: false, // We want to update, not ignore
    });

    if (error) {
      console.error("Error upserting user_book:", error);
      console.error("Status value:", status);

      // If we still get an enum error, it might be a database constraint issue
      if (error.code === "22P02") {
        console.error(
          "Database enum constraint error - attempting to clean up existing row"
        );

        // Delete the problematic row and try inserting fresh
        await supabase
          .from("user_books")
          .delete()
          .eq("user_id", userId)
          .eq("book_id", bookId);

        // Try one more time with insert
        const { error: insertError } = await supabase
          .from("user_books")
          .insert(payload);

        if (insertError) {
          console.error("Failed to insert after cleanup:", insertError);
          return false;
        }
      } else {
        return false;
      }
    }

    // Handle reading progress for currently reading books
    if (status === "currently_reading") {
      await supabase.from("reading_progress").upsert(
        {
          user_id: userId,
          book_id: bookId,
          pages_read: 0,
        },
        { onConflict: "user_id,book_id" }
      );
    }

    return true;
  } catch (error) {
    console.error("Error in upsertUserBook:", error);
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
        // 1. Find or create the Book info (Title, Cover, etc)
        const book = await findOrCreateBook(parsedBook);

        if (!book) {
          console.error(`Book not found/created: ${parsedBook.title}`);
          failed++;
          continue;
        }

        // 2. Create the User-Book relationship
        const success = await upsertUserBook(user.id, book.id, parsedBook);

        if (success) {
          imported++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Error processing book ${parsedBook.title}:`, error);
        failed++;
      }
    }

    return {
      success: true,
      imported,
      failed,
      message: `Import complete: ${imported} imported, ${failed} failed`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
