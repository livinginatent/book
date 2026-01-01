/**
 * Analytics logic utilities for reading insights
 */

interface FinishedUserBook {
  rating: number | null;
  reading_format: "physical" | "ebook" | "audiobook" | null;
  review_attributes: Record<string, unknown> | null;
  books:
    | { subjects: string[] }[]
    | { subjects: string[] }
    | null;
}

interface WinningComboResult {
  pacing: string | null;
  readingFormat: string | null;
  moods: string[];
  subject: string | null;
  summary: string;
}

/**
 * Calculate the "winning combo" - the DNA profile of a user's highest-rated books
 * 
 * @param finishedBooks - Array of finished user_books with their book data
 * @returns A summary string describing the user's sweet spot reading profile
 */
export function calculateWinningCombo(
  finishedBooks: FinishedUserBook[]
): WinningComboResult | null {
  if (!finishedBooks || finishedBooks.length === 0) {
    return null;
  }

  // Step 1: Filter for books with rating >= 4.5
  const topTierBooks = finishedBooks.filter(
    (book) => book.rating !== null && book.rating >= 4.5
  );

  if (topTierBooks.length === 0) {
    return null;
  }

  // Step 2: Find most frequent pacing, reading_format, and top 2 moods
  const pacingMap = new Map<string, number>();
  const formatMap = new Map<string, number>();
  const moodsMap = new Map<string, number>();
  const subjectMap = new Map<
    string,
    { totalRating: number; count: number }
  >();

  for (const book of topTierBooks) {
    const reviewAttrs = book.review_attributes;
    const rating = book.rating || 0;

    // Count pacing
    if (reviewAttrs && typeof reviewAttrs.pacing === "string") {
      const pacing = reviewAttrs.pacing;
      pacingMap.set(pacing, (pacingMap.get(pacing) || 0) + 1);
    }

    // Count reading format
    if (book.reading_format) {
      const format = book.reading_format;
      formatMap.set(format, (formatMap.get(format) || 0) + 1);
    }

    // Count moods
    if (reviewAttrs && Array.isArray(reviewAttrs.moods)) {
      for (const mood of reviewAttrs.moods) {
        if (typeof mood === "string") {
          moodsMap.set(mood, (moodsMap.get(mood) || 0) + 1);
        }
      }
    }

    // Collect subjects for Step 3
    const bookData = book.books;
    const subjects = Array.isArray(bookData)
      ? bookData[0]?.subjects
      : (bookData as { subjects: string[] } | null)?.subjects;

    if (Array.isArray(subjects) && rating !== null) {
      for (const subject of subjects) {
        if (typeof subject === "string") {
          const existing = subjectMap.get(subject) || {
            totalRating: 0,
            count: 0,
          };
          existing.totalRating += rating;
          existing.count += 1;
          subjectMap.set(subject, existing);
        }
      }
    }
  }

  // Find most frequent pacing
  const mostFrequentPacing = Array.from(pacingMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Find most frequent reading format
  const mostFrequentFormat = Array.from(formatMap.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Find top 2 most frequent moods
  const topMoods = Array.from(moodsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([mood]) => mood);

  // Step 3: Find subject with highest average rating (minimum 2 books)
  const subjectsWithMinBooks = Array.from(subjectMap.entries())
    .filter(([, data]) => data.count >= 2)
    .map(([subject, data]) => ({
      subject,
      avgRating: data.totalRating / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);

  const topSubject = subjectsWithMinBooks[0]?.subject || null;

  // Format the summary string to match: "Fast-Paced, Dark, Thriller books read in Physical format."
  const parts: string[] = [];

  if (mostFrequentPacing) {
    // Format pacing (e.g., "fast-paced" -> "Fast-Paced")
    const formattedPacing = mostFrequentPacing
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("-");
    parts.push(formattedPacing);
  }

  if (topMoods.length > 0) {
    // Format moods (e.g., ["dark", "thriller"] -> "Dark, Thriller")
    const formattedMoods = topMoods
      .map((mood) => mood.charAt(0).toUpperCase() + mood.slice(1).toLowerCase())
      .join(", ");
    parts.push(formattedMoods);
  }

  if (topSubject) {
    // Format subject (capitalize first letter)
    const formattedSubject =
      topSubject.charAt(0).toUpperCase() + topSubject.slice(1).toLowerCase();
    parts.push(formattedSubject);
  }

  // Add "books" after all attributes
  if (parts.length > 0) {
    parts.push("books");
  }

  if (mostFrequentFormat) {
    // Format reading format (e.g., "physical" -> "Physical")
    const formattedFormat =
      mostFrequentFormat.charAt(0).toUpperCase() +
      mostFrequentFormat.slice(1).toLowerCase();
    parts.push(`read in ${formattedFormat} format`);
  }

  const summary =
    parts.length > 0
      ? `Your Sweet Spot: ${parts.join(", ")}.`
      : "Not enough data to determine your sweet spot.";

  return {
    pacing: mostFrequentPacing,
    readingFormat: mostFrequentFormat,
    moods: topMoods,
    subject: topSubject,
    summary,
  };
}

