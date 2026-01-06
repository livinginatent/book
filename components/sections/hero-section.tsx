"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { RiBook2Fill } from "react-icons/ri";

import { Button } from "../ui/button";
/* const floatingBooks = [
  { top: "10%", left: "5%", rotate: "-12deg", delay: "0s" },
  { top: "20%", right: "8%", rotate: "15deg", delay: "0.5s" },
  { bottom: "25%", left: "10%", rotate: "8deg", delay: "1s" },
  { bottom: "15%", right: "5%", rotate: "-8deg", delay: "1.5s" },
]; */

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Floating book illustrations */}
      {/*     {floatingBooks.map((book, i) => (
        <div
          key={i}
          className="absolute hidden lg:block opacity-20 animate-bounce"
          style={{
            top: book.top,
            left: book.left,
            right: book.right,
            bottom: book.bottom,
            transform: `rotate(${book.rotate})`,
            animationDelay: book.delay,
            animationDuration: "3s",
          }}
        >
          <BookOpen className="w-16 h-16 text-primary" />
        </div>
      ))} */}

      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <span>Your reading journey, reimagined</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
            Track books with{" "}
            <span className="text-primary relative">
              joy
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
              >
                <path
                  d="M2 10C50 2 150 2 198 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-primary/30"
                />
              </svg>
            </span>
            , not just data
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto text-pretty leading-relaxed">
            Booktab makes reading tracking feel like a celebration. Set goals,
            discover new favorites, and watch your library grow.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="#pricing">
              <Button
                size="lg"
                className="rounded-full px-8 py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                Start tracking free
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-6 text-lg border-2 hover:bg-secondary hover:text-primary bg-transparent"
              onClick={() => {
                const element = document.getElementById("how-it-works");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See how it works
            </Button>
          </div>

          {/* Social proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <span>
                <strong className="text-foreground">1k+</strong> happy readers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RiBook2Fill className="w-5 h-5 text-primary" />
              <span>
                <strong className="text-foreground">20k+</strong> books tracked
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
