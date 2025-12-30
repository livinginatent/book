"use client";

import { BookOpen, Flame, Calendar, Trophy } from "lucide-react";

import { BookCard } from "@/components/ui/book/book-card";
import { SectionHeading } from "@/components/ui/section-heading";

import { StatCard } from "../ui/stat-card";

const currentlyReading = [
  {
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    cover: "/colorful-book-cover-video-games.jpg",
    progress: 67,
  },
  {
    title: "The House in the Cerulean Sea",
    author: "TJ Klune",
    cover: "/whimsical-house-seaside-book-cover.jpg",
    progress: 34,
  },
  {
    title: "Project Hail Mary",
    author: "Andy Weir",
    cover: "/space-astronaut-sci-fi-book-cover.jpg",
    progress: 89,
  },
];

const recentlyFinished = [
  {
    title: "Lessons in Chemistry",
    author: "Bonnie Garmus",
    cover: "/retro-1960s-chemistry-lab-book-cover.jpg",
    rating: 4.5,
  },
  {
    title: "The Midnight Library",
    author: "Matt Haig",
    cover: "/magical-library-starry-night-book-cover.jpg",
    rating: 5,
  },
];

const stats = [
  { icon: BookOpen, value: "47", label: "Books this year" },
  { icon: Flame, value: "23", label: "Day streak" },
  { icon: Calendar, value: "Dec", label: "Most active month" },
  { icon: Trophy, value: "3", label: "Challenges won" },
];

export function ShowcaseSection() {
  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Your reading dashboard, at a glance"
          subtitle="See what tracking your books looks like. This is where the magic happens."
        />

        {/* Mock Dashboard */}
        <div className="mt-16 p-6 md:p-10 bg-card rounded-3xl border border-border shadow-2xl shadow-foreground/5">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                icon={stat.icon}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>

          {/* Currently Reading */}
          <div className="mb-10">
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Currently Reading
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {currentlyReading.map((book, index) => (
                <BookCard
                  key={book.title}
                  bookId={`mock-${index}`}
                  title={book.title}
                  author={book.author}
                  cover={book.cover}
                  progress={book.progress}
                />
              ))}
            </div>
          </div>

          {/* Recently Finished */}
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Recently Finished
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {recentlyFinished.map((book, index) => (
                <BookCard
                  key={book.title}
                  bookId={`mock-finished-${index}`}
                  title={book.title}
                  author={book.author}
                  cover={book.cover}
                  rating={book.rating}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
