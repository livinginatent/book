"use client";

import { BookOpen, Home,} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted flex flex-col items-center justify-center px-4 py-20">
      {/* Floating books decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-10 left-10 text-primary/20 animate-bounce"
          style={{ animationDelay: "0s" }}
        >
          <BookOpen size={32} />
        </div>
        <div
          className="absolute top-1/3 right-20 text-accent/20 animate-bounce"
          style={{ animationDelay: "0.5s" }}
        >
          <BookOpen size={24} />
        </div>
        <div
          className="absolute bottom-20 left-1/4 text-primary/15 animate-bounce"
          style={{ animationDelay: "1s" }}
        >
          <BookOpen size={28} />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 heading */}
        <div className="mb-8">
          <h1 className="text-7xl md:text-8xl font-bold text-primary mb-3 leading-tight">
            404
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-foreground">
            Page Not Found
          </p>
        </div>

        {/* Playful message */}
        <div className="mb-8 space-y-3">
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Oops! Looks like this page got lost in the library. Even the best
            books get misplaced sometimes.
          </p>
          <p className="text-sm text-muted-foreground italic">
            Let&apos;s get you back on track with your reading journey.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              <Home size={20} />
              Back Home
            </Button>
          </Link>
         
        </div>

      </div>
    </div>
  );
}
