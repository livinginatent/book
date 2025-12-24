"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GoogleBooksItem {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    language?: string;
    previewLink?: string;
    infoLink?: string;
  };
}

interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

export default function TestGoogleBooksPage() {
  const [query, setQuery] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GoogleBooksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawJson, setRawJson] = useState<string>("");

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("google_books_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("google_books_api_key", apiKey);
    } else {
      localStorage.removeItem("google_books_api_key");
    }
  }, [apiKey]);

  const searchGoogleBooks = async () => {
    if (!query.trim()) {
      setError("Please enter a search query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setRawJson("");

    try {
      // Google Books API endpoint
      let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`;
      
      // Add API key if provided
      if (apiKey.trim()) {
        apiUrl += `&key=${encodeURIComponent(apiKey.trim())}`;
      }
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GoogleBooksResponse = await response.json();
      setResults(data);
      setRawJson(JSON.stringify(data, null, 2));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      console.error("Google Books API error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      searchGoogleBooks();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Google Books API Test</h1>
      
      {/* API Key Section */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <Label htmlFor="api-key" className="text-sm font-medium mb-2 block">
          Google Books API Key (optional, but recommended for higher rate limits)
        </Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your Google Books API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1"
          />
          {apiKey && (
            <Button
              variant="outline"
              onClick={() => setApiKey("")}
              className="gap-2"
            >
              <Key className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Your API key is stored locally in your browser and will be saved for future use.
        </p>
      </div>
      
      {/* Search Section */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <Input
            type="text"
            placeholder="Search for books (e.g., 'harry potter', 'isbn:9780545010221')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={loading}
          />
          <Button 
            onClick={searchGoogleBooks} 
            disabled={loading}
            className="gap-2"
          >
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
      {results && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Total Items Found:</strong> {results.totalItems.toLocaleString()}
            </p>
            <p className="text-sm">
              <strong>Items Returned:</strong> {results.items?.length || 0}
            </p>
            <p className="text-sm">
              <strong>API Key Used:</strong> {apiKey ? "Yes" : "No (using public API)"}
            </p>
          </div>

          {/* Books List */}
          {results.items && results.items.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Books Found:</h2>
              {results.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex gap-4">
                    {item.volumeInfo.imageLinks?.thumbnail && (
                      <img
                        src={item.volumeInfo.imageLinks.thumbnail}
                        alt={item.volumeInfo.title}
                        className="w-24 h-32 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {item.volumeInfo.title}
                      </h3>
                      {item.volumeInfo.authors && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Authors:</strong> {item.volumeInfo.authors.join(", ")}
                        </p>
                      )}
                      {item.volumeInfo.publishedDate && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Published:</strong> {item.volumeInfo.publishedDate}
                        </p>
                      )}
                      {item.volumeInfo.pageCount && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Pages:</strong> {item.volumeInfo.pageCount}
                        </p>
                      )}
                      {item.volumeInfo.categories && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Categories:</strong> {item.volumeInfo.categories.join(", ")}
                        </p>
                      )}
                      {item.volumeInfo.industryIdentifiers && (
                        <div className="text-sm text-muted-foreground mt-2">
                          <strong>ISBN:</strong>{" "}
                          {item.volumeInfo.industryIdentifiers
                            .map((id) => `${id.type}: ${id.identifier}`)
                            .join(", ")}
                        </div>
                      )}
                      {item.volumeInfo.description && (
                        <p className="text-sm mt-2 line-clamp-3">
                          {item.volumeInfo.description}
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        {item.volumeInfo.previewLink && (
                          <a
                            href={item.volumeInfo.previewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Preview
                          </a>
                        )}
                        {item.volumeInfo.infoLink && (
                          <a
                            href={item.volumeInfo.infoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            More Info
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Raw JSON */}
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">Raw JSON Response:</h2>
            <pre className="p-4 bg-muted rounded-lg overflow-auto text-xs max-h-96">
              {rawJson}
            </pre>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Search Tips:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>Search by title: "harry potter"</li>
          <li>Search by author: "author:j.k. rowling"</li>
          <li>Search by ISBN: "isbn:9780545010221"</li>
          <li>Search by subject: "subject:fiction"</li>
          <li>Combine terms: "intitle:harry potter inauthor:rowling"</li>
        </ul>
      </div>
    </div>
  );
}

