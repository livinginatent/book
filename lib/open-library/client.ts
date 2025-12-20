import type {
  OpenLibrarySearchResult,
  OpenLibrarySearchDoc,
  OpenLibraryWork,
  OpenLibraryAuthor,
  NormalizedBook,
} from "./types";

const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org";
const COVERS_BASE_URL = "https://covers.openlibrary.org";

/**
 * Search Open Library for books matching a query
 */
export async function searchBooks(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    fields?: string[];
  } = {}
): Promise<OpenLibrarySearchResult> {
  const { limit = 20, offset = 0 } = options;

  // Default fields we need for our book cards
  const fields = options.fields ?? [
    "key",
    "title",
    "subtitle",
    "author_name",
    "author_key",
    "first_publish_year",
    "publish_year",
    "publisher",
    "isbn",
    "subject",
    "language",
    "cover_i",
    "cover_edition_key",
    "edition_key",
    "number_of_pages_median",
  ];

  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    offset: offset.toString(),
    fields: fields.join(","),
  });

  const response = await fetch(
    `${OPEN_LIBRARY_BASE_URL}/search.json?${params}`,
    {
      headers: {
        "User-Agent": "BookApp/1.0 (contact@example.com)",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`Open Library search failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get detailed work information from Open Library
 */
export async function getWork(workId: string): Promise<OpenLibraryWork | null> {
  // workId can be "/works/OL123W" or just "OL123W"
  const id = workId.replace("/works/", "");

  const response = await fetch(`${OPEN_LIBRARY_BASE_URL}/works/${id}.json`, {
    headers: {
      "User-Agent": "BookApp/1.0 (contact@example.com)",
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch work ${id}: ${response.status}`);
  }

  return response.json();
}

/**
 * Get author information from Open Library
 */
export async function getAuthor(
  authorId: string
): Promise<OpenLibraryAuthor | null> {
  // authorId can be "/authors/OL123A" or just "OL123A"
  const id = authorId.replace("/authors/", "");

  const response = await fetch(`${OPEN_LIBRARY_BASE_URL}/authors/${id}.json`, {
    headers: {
      "User-Agent": "BookApp/1.0 (contact@example.com)",
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch author ${id}: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate cover image URLs from a cover ID
 */
export function getCoverUrls(coverId: number | undefined): {
  small?: string;
  medium?: string;
  large?: string;
} {
  if (!coverId) return {};

  return {
    small: `${COVERS_BASE_URL}/b/id/${coverId}-S.jpg`,
    medium: `${COVERS_BASE_URL}/b/id/${coverId}-M.jpg`,
    large: `${COVERS_BASE_URL}/b/id/${coverId}-L.jpg`,
  };
}

/**
 * Extract text from Open Library description field
 * (can be string or { type: string, value: string })
 */
function extractDescription(
  desc: string | { type: string; value: string } | undefined
): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === "string") return desc;
  return desc.value;
}

/**
 * Separate ISBNs into ISBN-10 and ISBN-13
 */
function separateIsbns(isbns: string[] | undefined): {
  isbn10: string[];
  isbn13: string[];
} {
  const isbn10: string[] = [];
  const isbn13: string[] = [];

  if (!isbns) return { isbn10, isbn13 };

  for (const isbn of isbns) {
    const cleaned = isbn.replace(/[-\s]/g, "");
    if (cleaned.length === 10) {
      isbn10.push(cleaned);
    } else if (cleaned.length === 13) {
      isbn13.push(cleaned);
    }
  }

  return { isbn10, isbn13 };
}

/**
 * Normalize an Open Library search doc to our application format
 */
export function normalizeSearchDoc(doc: OpenLibrarySearchDoc): NormalizedBook {
  const covers = getCoverUrls(doc.cover_i);
  const { isbn10, isbn13 } = separateIsbns(doc.isbn);

  // Extract work ID from key (e.g., "/works/OL45804W" -> "OL45804W")
  const openLibraryId = doc.key.replace("/works/", "");

  return {
    openLibraryId,
    openLibraryEditionId: doc.cover_edition_key,
    title: doc.title,
    subtitle: doc.subtitle,
    authors: doc.author_name ?? [],
    description: doc.first_sentence?.[0],
    subjects: (doc.subject ?? []).slice(0, 10), // Limit subjects
    publishDate: doc.first_publish_year?.toString(),
    publishers: (doc.publisher ?? []).slice(0, 5), // Limit publishers
    isbn10,
    isbn13,
    pageCount: doc.number_of_pages_median,
    coverUrlSmall: covers.small,
    coverUrlMedium: covers.medium,
    coverUrlLarge: covers.large,
    language: doc.language?.[0],
  };
}

/**
 * Search and normalize books in one call
 */
export async function searchAndNormalizeBooks(
  query: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ books: NormalizedBook[]; total: number }> {
  const result = await searchBooks(query, options);

  return {
    books: result.docs.map(normalizeSearchDoc),
    total: result.numFound,
  };
}

