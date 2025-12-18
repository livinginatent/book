"use client";

import { BookOpen, Plus } from "lucide-react";

import { BookCard } from "@/components/ui/book-card";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  progress: number;
}

interface CurrentlyReadingProps {
  books: Book[];
}

export function CurrentlyReading({ books }: CurrentlyReadingProps) {
  return (
    <DashboardCard
      title="Currently Reading"
      description={`${books.length} book${
        books.length !== 1 ? "s" : ""
      } in progress`}
      icon={BookOpen}
      action={
        <Button variant="ghost" size="sm" className="rounded-xl">
          <Plus className="w-4 h-4 mr-1" />
          Add Book
        </Button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            title={book.title}
            author={book.author}
            cover={book.cover}
            progress={book.progress}
          />
        ))}
      </div>
    </DashboardCard>
  );
}
