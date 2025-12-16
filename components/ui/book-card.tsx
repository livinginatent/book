"use client";

import { cn } from "@/lib/utils";
import { Star, BookOpen } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  cover: string;
  rating?: number;
  progress?: number;
  className?: string;
}

export function BookCard({
  title,
  author,
  cover,
  rating,
  progress,
  className,
}: BookCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col",
        "transition-transform duration-300 hover:-translate-y-2",
        className
      )}
    >
      {/* Book Cover */}
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg shadow-foreground/10 mb-3">
        <img
          src={cover || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Progress overlay */}
        {progress !== undefined && progress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/80 to-transparent p-3">
            <div className="flex items-center gap-2 text-background text-sm">
              <BookOpen className="w-4 h-4" />
              <span>{progress}%</span>
            </div>
            <div className="mt-1 h-1 bg-background/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Book Info */}
      <h4 className="font-semibold text-foreground line-clamp-2 leading-tight mb-1">
        {title}
      </h4>
      <p className="text-sm text-muted-foreground mb-1">{author}</p>

      {/* Rating */}
      {rating && (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                "w-3.5 h-3.5",
                i < Math.floor(rating)
                  ? "fill-primary text-primary"
                  : "text-border"
              )}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{rating}</span>
        </div>
      )}
    </div>
  );
}
