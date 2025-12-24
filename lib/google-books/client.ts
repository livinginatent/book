import type {
  GoogleBooksSearchResponse,
  GoogleBooksVolume,
  NormalizedBook,
} from "./types";

const GOOGLE_BOOKS_BASE_URL = "https://www.googleapis.com/books/v1";

/**
 * Get Google Books API key from environment variable
 */
function getApiKey(): string | undefined {
  return process.env.GOOGLE_BOOKS_API_KEY;
}

/**
 * Search Google Books for volumes matching a query
 * Optimized for speed with proper caching and API key support
 */
export async function searchBooks(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    apiKey?: string;
  } = {}
): Promise<GoogleBooksSearchResponse> {
  const { limit = 20, offset = 0, apiKey } = options;

  // Build query parameters
  const params = new URLSearchParams({
    q: query,
    maxResults: Math.min(limit, 40).toString(), // Google Books max is 40 per request
    startIndex: offset.toString(),
    fields: "kind,totalItems,items(id,volumeInfo(title,subtitle,authors,publisher,publishedDate,description,industryIdentifiers,pageCount,categories,language,imageLinks))",
  });

  // Add API key if provided or available from env
  const key = apiKey || getApiKey();
  if (key) {
    params.append("key", key);
    // Log that API key is being used (remove in production if desired)
    console.log("[Google Books API] Using API key for request");
  } else {
    console.warn("[Google Books API] No API key found - using public API (lower rate limits)");
  }

  const url = `${GOOGLE_BOOKS_BASE_URL}/volumes?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "BookApp/1.0",
    },
    // Cache for 1 hour to optimize speed
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Google Books search failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

/**
 * Get a specific volume by Google Books ID
 */
export async function getVolume(
  volumeId: string,
  options: { apiKey?: string } = {}
): Promise<GoogleBooksVolume | null> {
  const params = new URLSearchParams();

  const key = options.apiKey || getApiKey();
  if (key) {
    params.append("key", key);
  }

  const url = `${GOOGLE_BOOKS_BASE_URL}/volumes/${volumeId}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "BookApp/1.0",
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch volume ${volumeId}: ${response.status}`);
  }

  return response.json();
}

/**
 * Separate ISBNs into ISBN-10 and ISBN-13
 */
function separateIsbns(
  industryIdentifiers?: Array<{ type: string; identifier: string }>
): {
  isbn10: string[];
  isbn13: string[];
} {
  const isbn10: string[] = [];
  const isbn13: string[] = [];

  if (!industryIdentifiers) return { isbn10, isbn13 };

  for (const identifier of industryIdentifiers) {
    const cleaned = identifier.identifier.replace(/[-\s]/g, "");
    if (identifier.type === "ISBN_10" || cleaned.length === 10) {
      isbn10.push(cleaned);
    } else if (identifier.type === "ISBN_13" || cleaned.length === 13) {
      isbn13.push(cleaned);
    }
  }

  return { isbn10, isbn13 };
}

/**
 * Extract and clean cover image URLs
 */
function getCoverUrls(imageLinks?: {
  smallThumbnail?: string;
  thumbnail?: string;
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}): {
  small?: string;
  medium?: string;
  large?: string;
} {
  if (!imageLinks) return {};

  // Google Books returns http:// URLs, convert to https://
  const convertToHttps = (url?: string) => {
    if (!url) return undefined;
    return url.replace(/^http:\/\//, "https://");
  };

  return {
    small: convertToHttps(imageLinks.smallThumbnail || imageLinks.thumbnail),
    medium: convertToHttps(imageLinks.medium || imageLinks.thumbnail),
    large: convertToHttps(
      imageLinks.large || imageLinks.extraLarge || imageLinks.medium
    ),
  };
}

/**
 * Normalize a Google Books volume to our application format
 */
export function normalizeVolume(volume: GoogleBooksVolume): NormalizedBook {
  const covers = getCoverUrls(volume.volumeInfo.imageLinks);
  const { isbn10, isbn13 } = separateIsbns(
    volume.volumeInfo.industryIdentifiers
  );

  // Extract publisher(s) - Google Books provides single publisher, but we use array
  const publishers = volume.volumeInfo.publisher
    ? [volume.volumeInfo.publisher]
    : [];

  return {
    googleBooksId: volume.id,
    title: volume.volumeInfo.title,
    subtitle: volume.volumeInfo.subtitle,
    authors: volume.volumeInfo.authors ?? [],
    description: volume.volumeInfo.description,
    subjects: volume.volumeInfo.categories ?? [],
    publishDate: volume.volumeInfo.publishedDate,
    publishers,
    isbn10,
    isbn13,
    pageCount: volume.volumeInfo.pageCount,
    coverUrlSmall: covers.small,
    coverUrlMedium: covers.medium,
    coverUrlLarge: covers.large,
    language: volume.volumeInfo.language,
  };
}

/**
 * Search and normalize books in one call
 * Optimized for speed with parallel processing where possible
 */
export async function searchAndNormalizeBooks(
  query: string,
  options: {
    limit?: number;
    offset?: number;
    apiKey?: string;
  } = {}
): Promise<{ books: NormalizedBook[]; total: number }> {
  const result = await searchBooks(query, options);

  if (!result.items || result.items.length === 0) {
    return { books: [], total: result.totalItems };
  }

  // Normalize all books (this is fast, no async operations)
  const books = result.items.map(normalizeVolume);

  return {
    books,
    total: result.totalItems,
  };
}

