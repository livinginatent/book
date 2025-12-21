"use client";

import { Calendar, BookOpen, Clock, Hash } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MoodTag } from "@/components/ui/mood-tag";
import { cn } from "@/lib/utils";
import { BookFormat, FormatBadge } from "../ui/format-badge";



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
  const progress = Math.round((book.pagesRead / book.totalPages) * 100);
  const daysReading = Math.ceil(
    (new Date().getTime() - book.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleFormatChange = (format: BookFormat) => {
    setSelectedFormat(format);
    onFormatChange?.(format);
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
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
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
          <p className="text-xs text-muted-foreground mb-2">Reading format</p>
          <div className="flex gap-2">
            {(["physical", "ebook", "audiobook"] as BookFormat[]).map(
              (format) => (
                <FormatBadge
                  key={format}
                  format={format}
                  selectable
                  selected={selectedFormat === format}
                  onClick={() => handleFormatChange(format)}
                />
              )
            )}
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
          <Hash className="w-4 h-4 mr-2" />
          Update Progress
        </Button>
      </div>
    </div>
  );
}
