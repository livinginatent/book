/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Calendar, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { BookFormat, FormatBadge } from "@/components/ui/book/format-badge";
import { Button } from "@/components/ui/button";
import { MoodTag } from "@/components/ui/mood-tag";
import { cn } from "@/lib/utils";

interface BookDetailCardProps {
  book: {
    id: string;
    title: string;
    author: string;
    cover: string;
    totalPages: number;
    pagesRead: number;
    startDate: Date;
    format: BookFormat;
    series?: { name: string; number: number; total: number };
    moods: string[];
    pace: string;
  };
  estimatedFinish: string;
  onFormatChange?: (format: BookFormat) => void;
  onUpdateProgress?: () => void;
  className?: string;
}

export function BookDetailCard({
  book,
  estimatedFinish,
  onFormatChange,
  onUpdateProgress,
  className,
}: BookDetailCardProps) {
  const [selectedFormat, setSelectedFormat] = useState<BookFormat>(book.format);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const isUserUpdateRef = useRef(false);

  // Sync format when book prop changes (but not if user just updated it)
  // Note: Syncing state from props in useEffect is necessary here for prop updates
  useEffect(() => {
    if (!isUserUpdateRef.current) {
      setSelectedFormat(book.format);
    }
    isUserUpdateRef.current = false;
  }, [book.format]);

  // Hide success message after 2 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const progress = Math.round((book.pagesRead / book.totalPages) * 100);
  const daysReading = Math.ceil(
    (new Date().getTime() - book.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleFormatChange = async (format: BookFormat) => {
    // Mark that this is a user update
    isUserUpdateRef.current = true;

    // Optimistically update UI
    setSelectedFormat(format);

    // Call parent handler (which will call the server action)
    await onFormatChange?.(format);

    // Show success message
    setShowSuccessMessage(true);
  };

  return (
    <div className={cn("flex flex-col md:flex-row gap-6", className)}>
      {/* Book Cover */}
      <div className="relative flex-shrink-0 mx-auto md:mx-0">
        <div className="w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl shadow-foreground/10">
          <img
            src={book.cover || "/placeholder.svg"}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Progress overlay */}
        <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-full bg-card border-4 border-background flex items-center justify-center shadow-lg">
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
      </div>

      {/* Book Info */}
      <div className="flex-1 flex flex-col">
        <div className="mb-2">
          {book.series && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              Book {book.series.number} of {book.series.total}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {book.title}
        </h1>
        <p className="text-muted-foreground mb-4">{book.author}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium text-foreground">
              {book.pagesRead} pages
            </span>
            <span className="text-muted-foreground">of {book.totalPages}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Started {daysReading} days ago</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{estimatedFinish}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{book.totalPages} pages total</span>
          </div>
        </div>

        {/* Format Switcher */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-muted-foreground">Reading format</p>
            {showSuccessMessage && (
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(["physical", "ebook"] as BookFormat[]).map((format) => (
              <FormatBadge
                key={format}
                format={format}
                selectable
                selected={selectedFormat === format}
                onClick={() => handleFormatChange(format)}
              />
            ))}
          </div>
        </div>

        {/* Moods & Pace */}
        <div className="flex flex-wrap gap-2">
          {book.moods.map((mood, i) => (
            <MoodTag
              key={mood}
              mood={mood}
              color={i % 2 === 0 ? "coral" : "teal"}
            />
          ))}
          <MoodTag mood={book.pace} color="purple" />
        </div>

        <Button onClick={onUpdateProgress} className="mt-4 md:w-fit">
          Update Progress
        </Button>
      </div>
    </div>
  );
}
