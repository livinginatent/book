"use client";

import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  X,
  Loader2,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import type React from "react";
import { useState } from "react";

import {
  parseGoodreadsCSV,
  importGoodreadsBooks,
  type ParsedBook,
} from "@/app/actions/import-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type ImportStatus =
  | "idle"
  | "parsing"
  | "preview"
  | "importing"
  | "complete"
  | "error";

interface GoodreadsImportProps {
  onImportComplete?: (imported: number, failed: number) => void;
  className?: string;
}

export function GoodreadsImport({
  onImportComplete,
  className,
}: GoodreadsImportProps) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [books, setBooks] = useState<ParsedBook[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file type
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      setStatus("error");
      return;
    }

    setFileName(file.name);
    setStatus("parsing");
    setError(null);

    try {
      // Create FormData to send the file
      const formData = new FormData();
      formData.append("file", file);

      // Call the server action to parse the CSV
      const result = await parseGoodreadsCSV(formData);

      if (!result.success) {
        setError(result.error);
        setStatus("error");
        return;
      }

      setBooks(result.books);
      setStatus("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
      setStatus("error");
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setBooks((prev) =>
      prev.map((book) =>
        book.id === bookId ? { ...book, selected: !book.selected } : book
      )
    );
  };

  const toggleAllBooks = (selected: boolean) => {
    setBooks((prev) => prev.map((book) => ({ ...book, selected })));
  };

  const handleImport = async () => {
    const selectedBooks = books.filter((b) => b.selected);
    if (selectedBooks.length === 0) return;

    setStatus("importing");
    setImportProgress(0);

    try {
      // Simulate progress while importing
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      // Call the actual import function
      const result = await importGoodreadsBooks(selectedBooks);

      clearInterval(progressInterval);

      if (!result.success) {
        setError(result.error);
        setStatus("error");
        return;
      }

      setImportProgress(100);
      setImportedCount(result.imported);
      setFailedCount(result.failed);
      setStatus("complete");
      onImportComplete?.(result.imported, result.failed);

      // Dispatch event to refresh currently reading
      window.dispatchEvent(new CustomEvent("book-added"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setFileName(null);
    setBooks([]);
    setImportProgress(0);
    setImportedCount(0);
    setFailedCount(0);
    setError(null);
  };

  const selectedCount = books.filter((b) => b.selected).length;
  const shelfCounts = {
    read: books.filter((b) => b.shelf === "read" && b.selected).length,
    "currently-reading": books.filter(
      (b) => b.shelf === "currently-reading" && b.selected
    ).length,
    "to-read": books.filter((b) => b.shelf === "to-read" && b.selected).length,
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Import from Goodreads
        </h2>
        <p className="text-muted-foreground">
          Bring your reading history to Bookly in just a few clicks
        </p>
      </div>

      {/* Main Content Area */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Idle State - File Upload */}
        {status === "idle" && (
          <div className="p-6">
            {/* Help Section */}
            <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">
                    How to export from Goodreads:
                  </p>
                  <ol className="text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to My Books on Goodreads</li>
                    <li>Click Import and Export (left sidebar)</li>
                    <li>Click Export Library to download your CSV</li>
                  </ol>
                  <a
                    href="https://www.goodreads.com/review/import"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-accent hover:underline font-medium"
                  >
                    Open Goodreads Export Page
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Drop Zone */}
            <label
              className={cn(
                "relative flex flex-col items-center justify-center p-10 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
                dragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-200",
                  dragActive
                    ? "bg-primary text-primary-foreground scale-110"
                    : "bg-muted"
                )}
              >
                <Upload
                  className={cn(
                    "w-7 h-7",
                    dragActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <p className="text-foreground font-medium mb-1">
                {dragActive
                  ? "Drop your file here!"
                  : "Drag & drop your Goodreads export"}
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse (CSV file)
              </p>
            </label>
          </div>
        )}

        {/* Parsing State */}
        {status === "parsing" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Reading your library...
            </h3>
            <p className="text-muted-foreground">Parsing {fileName}</p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Something went wrong
            </h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={reset} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Preview State */}
        {status === "preview" && (
          <div>
            {/* File Info Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    {fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {books.length} books found
                  </p>
                </div>
              </div>
              <button
                onClick={reset}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Selection Controls */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedCount === books.length}
                  onCheckedChange={(checked: boolean) =>
                    toggleAllBooks(!!checked)
                  }
                />
                <span className="text-sm font-medium text-foreground">
                  Select all ({selectedCount} selected)
                </span>
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-accent/10 text-accent">
                  {shelfCounts.read} read
                </span>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                  {shelfCounts["currently-reading"]} reading
                </span>
                <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                  {shelfCounts["to-read"]} to-read
                </span>
              </div>
            </div>

            {/* Book List */}
            <div className="max-h-80 overflow-y-auto">
              {books.map((book) => (
                <label
                  key={book.id}
                  className={cn(
                    "flex items-center gap-4 p-4 border-b border-border last:border-b-0 cursor-pointer transition-colors",
                    book.selected ? "bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={book.selected}
                    onCheckedChange={() => toggleBookSelection(book.id)}
                  />
                  <div className="w-10 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {book.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {book.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {book.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              "text-xs",
                              i < book.rating ? "text-amber-400" : "text-muted"
                            )}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        book.shelf === "read" && "bg-accent/10 text-accent",
                        book.shelf === "currently-reading" &&
                          "bg-primary/10 text-primary",
                        book.shelf === "to-read" &&
                          "bg-muted text-muted-foreground"
                      )}
                    >
                      {book.shelf === "currently-reading"
                        ? "reading"
                        : book.shelf.replace("-", " ")}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Import Button */}
            <div className="p-4 border-t border-border bg-muted/30">
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="w-full gap-2"
              >
                Import {selectedCount} Books
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Importing State */}
        {status === "importing" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Importing your books...
            </h3>
            <p className="text-muted-foreground mb-6">
              Adding {selectedCount} books to your library
            </p>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {importProgress}%
            </p>
          </div>
        )}

        {/* Complete State */}
        {status === "complete" && (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Import Complete!
            </h3>
            <p className="text-muted-foreground mb-6">
              Successfully imported {importedCount} books to your library
              {failedCount > 0 && (
                <span className="block text-sm text-muted-foreground mt-1">
                  ({failedCount} books could not be found)
                </span>
              )}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={reset} variant="outline">
                Import More
              </Button>
              <Button
                className="gap-2"
                onClick={() => (window.location.href = "/")}
              >
                View Library
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
