"use client";

import { useState } from "react";
import { Search, Loader2, Database, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testLazyFetch } from "./actions";

interface TestResult {
  books: Array<{
    id: string;
    title: string;
    authors: string[] | null;
    google_books_id: string | null;
    cover_url_small: string | null;
  }>;
  total: number;
  fromCache: number;
  fromGoogleBooks: number;
  duration: number;
}

export default function TestLazyFetchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await testLazyFetch(query);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Lazy Fetch Cache Test</h1>
      <p className="text-muted-foreground mb-6">
        Test whether books are being fetched from the database cache or Google Books API
      </p>

      {/* Search Section */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Search for books (e.g., 'harry potter', 'atomic habits')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Cache Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{result.books.length}</p>
              <p className="text-sm text-muted-foreground">Books Returned</p>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Database className="w-5 h-5 text-green-600" />
                <p className="text-3xl font-bold text-green-600">{result.fromCache}</p>
              </div>
              <p className="text-sm text-green-600">From DB Cache</p>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Cloud className="w-5 h-5 text-blue-600" />
                <p className="text-3xl font-bold text-blue-600">{result.fromGoogleBooks}</p>
              </div>
              <p className="text-sm text-blue-600">From Google Books</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{result.duration}ms</p>
              <p className="text-sm text-muted-foreground">Duration</p>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">What does this mean?</h3>
            <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
              <li>
                <strong className="text-green-600">From DB Cache:</strong> Books that were already in your database (299 books)
              </li>
              <li>
                <strong className="text-blue-600">From Google Books:</strong> New books fetched from Google and saved to your DB
              </li>
              <li>
                <strong>Pro tip:</strong> Search for the same query twice - the second time should show more cached results!
              </li>
            </ul>
          </div>

          {/* Books List */}
          {result.books.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Books Found ({result.total} total):</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.books.map((book) => (
                  <div key={book.id} className="p-4 border rounded-lg flex gap-4">
                    {book.cover_url_small ? (
                      <img
                        src={book.cover_url_small}
                        alt={book.title}
                        className="w-16 h-24 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No cover
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{book.title}</h3>
                      {book.authors && (
                        <p className="text-sm text-muted-foreground truncate">
                          {book.authors.join(", ")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        DB ID: <code className="bg-muted px-1 rounded">{book.id}</code>
                      </p>
                      {book.google_books_id && (
                        <p className="text-xs text-muted-foreground">
                          Google ID: <code className="bg-muted px-1 rounded">{book.google_books_id}</code>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">How to test caching:</h3>
        <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
          <li>Search for a book you know is in your database (299 books)</li>
          <li>Check the "From DB Cache" number - it should be &gt; 0 if the book exists</li>
          <li>Search for something new, then search again - second search should show cached results</li>
          <li>If "From Google Books" is 0, all results came from your database!</li>
        </ol>
      </div>
    </div>
  );
}



