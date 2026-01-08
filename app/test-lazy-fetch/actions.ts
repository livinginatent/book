"use server";

import { lazyFetchBooks } from "@/lib/books/lazy-fetch";

export async function testLazyFetch(query: string) {
  const start = Date.now();

  const result = await lazyFetchBooks(query, {
    limit: 20,
    offset: 0,
  });

  const duration = Date.now() - start;

  return {
    books: result.books.map((book) => ({
      id: book.id,
      title: book.title,
      authors: book.authors,
      google_books_id: book.google_books_id,
      cover_url_small: book.cover_url_small,
    })),
    total: result.total,
    fromCache: result.fromCache,
    fromGoogleBooks: result.fromGoogleBooks,
    duration,
  };
}











