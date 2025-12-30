"use server";

import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface UpdateBookReviewResult {
  success: true;
  message: string;
}

export interface UpdateBookReviewError {
  success: false;
  error: string;
}

/**
 * Round a number to the nearest 0.25
 */
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

/**
 * Validate and normalize rating to be between 0 and 5, rounded to nearest 0.25
 */
function validateRating(rating: number): number | null {
  if (rating < 0 || rating > 5) {
    return null;
  }
  return roundToQuarter(rating);
}

/**
 * Update a book review for the current user
 * Sets the rating and merges attributes into the review_attributes JSONB column
 */
export async function updateBookReview(
  bookId: string,
  rating: number,
  attributes: Record<string, unknown>
): Promise<UpdateBookReviewResult | UpdateBookReviewError> {
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

    // Validate bookId
    if (!bookId || typeof bookId !== "string") {
      return { success: false, error: "Book ID is required" };
    }

    // Validate and normalize rating
    const validatedRating = validateRating(rating);
    if (validatedRating === null) {
      return {
        success: false,
        error: "Rating must be between 0 and 5",
      };
    }

    // Validate attributes is an object
    if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
      return {
        success: false,
        error: "Attributes must be an object",
      };
    }

    // Fetch existing user_book record to get current review_attributes
    const { data: existingUserBook, error: fetchError } = await supabase
      .from("user_books")
      .select("review_attributes")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching user_book:", fetchError);
      return {
        success: false,
        error: "Failed to fetch book record",
      };
    }

    // Merge existing review_attributes with new attributes
    const existingAttributes =
      (existingUserBook?.review_attributes as Record<string, unknown>) || {};
    const mergedAttributes = {
      ...existingAttributes,
      ...attributes,
    };

    // Prepare upsert data
    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      book_id: bookId,
      rating: validatedRating,
      review_attributes: mergedAttributes,
      updated_at: new Date().toISOString(),
    };

    // If record doesn't exist, set default status and date_added
    if (!existingUserBook) {
      upsertData.status = "want_to_read";
      upsertData.date_added = new Date().toISOString();
    }

    // Use upsert to handle both insert and update cases
    const { error: upsertError } = await supabase
      .from("user_books")
      .upsert(upsertData, {
        onConflict: "user_id,book_id",
      });

    if (upsertError) {
      console.error("Error upserting user_book:", upsertError);
      return {
        success: false,
        error: "Failed to update book review",
      };
    }

    return {
      success: true,
      message: "Book review updated successfully",
    };
  } catch (error) {
    console.error("Update book review error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface BookInsightsResult {
  success: true;
  summary: string;
  moods: Array<{ mood: string; percentage: number }>;
  averagePacing: string | null;
  totalReviews: number;
}

export interface BookInsightsError {
  success: false;
  error: string;
}

/**
 * Get global book insights by aggregating review data from all users
 * Returns the most common moods and average pacing for a book
 */
export async function getGlobalBookInsights(
  bookId: string
): Promise<BookInsightsResult | BookInsightsError> {
  try {
    // Validate bookId
    if (!bookId || typeof bookId !== "string") {
      return { success: false, error: "Book ID is required" };
    }

    // Fetch all user_books records for this book that have review_attributes
    const { data: userBooks, error: fetchError } = await supabaseAdmin
      .from("user_books")
      .select("review_attributes")
      .eq("book_id", bookId)
      .not("review_attributes", "is", null);

    if (fetchError) {
      console.error("Error fetching user_books:", fetchError);
      return {
        success: false,
        error: "Failed to fetch book reviews",
      };
    }

    if (!userBooks || userBooks.length === 0) {
      return {
        success: true,
        summary: "No community reviews yet",
        moods: [],
        averagePacing: null,
        totalReviews: 0,
      };
    }

    // Aggregate moods and pacing from review_attributes
    const moodCounts: Record<string, number> = {};
    const pacingValues: string[] = [];
    let totalReviewsWithData = 0;

    for (const userBook of userBooks) {
      const attributes = userBook.review_attributes as
        | {
            moods?: string[];
            pacing?: string | null;
          }
        | null;

      if (!attributes) continue;

      totalReviewsWithData++;

      // Count moods
      if (Array.isArray(attributes.moods)) {
        for (const mood of attributes.moods) {
          if (typeof mood === "string") {
            moodCounts[mood] = (moodCounts[mood] || 0) + 1;
          }
        }
      }

      // Collect pacing values
      if (attributes.pacing && typeof attributes.pacing === "string") {
        pacingValues.push(attributes.pacing);
      }
    }

    // Calculate mood percentages
    const moodEntries = Object.entries(moodCounts)
      .map(([mood, count]) => ({
        mood,
        percentage: Math.round((count / totalReviewsWithData) * 100),
      }))
      .sort((a, b) => b.percentage - a.percentage);

    // Calculate average pacing
    let averagePacing: string | null = null;
    if (pacingValues.length > 0) {
      const pacingMap: Record<string, number> = {
        Slow: 1,
        Medium: 2,
        Fast: 3,
      };

      const numericValues = pacingValues
        .map((p) => pacingMap[p])
        .filter((v) => v !== undefined);

      if (numericValues.length > 0) {
        const average =
          numericValues.reduce((sum, val) => sum + val, 0) /
          numericValues.length;

        // Round to nearest and map back to string
        const rounded = Math.round(average);
        if (rounded === 1) averagePacing = "Slow";
        else if (rounded === 2) averagePacing = "Medium";
        else if (rounded === 3) averagePacing = "Fast";
      }
    }

    // Build summary string
    const moodParts: string[] = [];
    if (moodEntries.length > 0) {
      // Take top 2 moods
      const topMoods = moodEntries.slice(0, 2);
      moodParts.push(
        ...topMoods.map((m) => `${m.percentage}% ${m.mood}`)
      );
    }

    const summaryParts: string[] = [];
    if (moodParts.length > 0) {
      summaryParts.push(moodParts.join(", "));
    }
    if (averagePacing) {
      summaryParts.push(`${averagePacing}-paced`);
    }

    const summary =
      summaryParts.length > 0
        ? `Community says: ${summaryParts.join(", ")}`
        : "No community insights available";

    return {
      success: true,
      summary,
      moods: moodEntries,
      averagePacing,
      totalReviews: totalReviewsWithData,
    };
  } catch (error) {
    console.error("Get global book insights error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

