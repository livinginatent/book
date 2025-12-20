// Open Library API response types

export interface OpenLibrarySearchResult {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibrarySearchDoc[];
}

export interface OpenLibrarySearchDoc {
  key: string; // e.g., "/works/OL45804W"
  title: string;
  subtitle?: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  publisher?: string[];
  isbn?: string[];
  subject?: string[];
  language?: string[];
  cover_i?: number; // Cover ID for generating cover URLs
  cover_edition_key?: string;
  edition_key?: string[];
  number_of_pages_median?: number;
  first_sentence?: string[];
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  subtitle?: string;
  description?: string | { type: string; value: string };
  subjects?: string[];
  authors?: { author: { key: string } }[];
  covers?: number[];
}

export interface OpenLibraryAuthor {
  key: string;
  name: string;
  personal_name?: string;
  bio?: string | { type: string; value: string };
}

// Normalized book data for our application
export interface NormalizedBook {
  openLibraryId: string;
  openLibraryEditionId?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  subjects: string[];
  publishDate?: string;
  publishers: string[];
  isbn10: string[];
  isbn13: string[];
  pageCount?: number;
  coverUrlSmall?: string;
  coverUrlMedium?: string;
  coverUrlLarge?: string;
  language?: string;
}

