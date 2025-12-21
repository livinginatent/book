import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

interface UpNextBook {
  id: string;
  title: string;
  author: string;
  cover: string;
}

interface UpNextPreviewProps {
  books: UpNextBook[];
  className?: string;
}

export function UpNextPreview({ books, className }: UpNextPreviewProps) {
  if (books.length === 0) return null;

  return (
    <div
      className={cn(
        "p-4 rounded-2xl bg-gradient-to-r from-primary/5 to-accent/5 border border-border",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Up Next</h4>
        <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {books.slice(0, 3).map((book, i) => (
          <div key={book.id} className="flex-shrink-0 group cursor-pointer">
            <div className="relative w-16 aspect-[2/3] rounded-lg overflow-hidden shadow-md transition-transform group-hover:scale-105 group-hover:-translate-y-1">
              <img
                src={book.cover || "/placeholder.svg"}
                alt={book.title}
                className="w-full h-full object-cover"
              />
              {i === 0 && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  1
                </div>
              )}
            </div>
            <p className="mt-1.5 text-xs font-medium text-foreground line-clamp-1 max-w-16">
              {book.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
