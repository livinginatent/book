/* eslint-disable react/no-unescaped-entities */
import {  Users, Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RiBook2Fill } from "react-icons/ri";
import { TbProgress } from "react-icons/tb";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Coming Soon - Booktab",
  description:
    "Exciting new features are on the way! Stay tuned for book discovery, reading challenges, and book clubs.",
  openGraph: {
    title: "Coming Soon - Booktab",
    description:
      "Exciting new features are on the way! Stay tuned for book discovery, reading challenges, and book clubs.",
    type: "website",
  },
};

const upcomingFeatures = [
  {
    icon: RiBook2Fill,
    title: "Discover Books",
    description:
      "Explore curated book recommendations, trending reads, and personalized suggestions based on your reading history.",
    status: "In Development",
  },
  {
    icon: Target,
    title: "Reading Challenges",
    description:
      "Join community challenges, compete with friends, and earn badges as you hit reading milestones throughout the year.",
    status: "In Development",
  },
  {
    icon: Users,
    title: "Book Clubs",
    description:
      "Create or join book clubs, discuss your favorite reads, and connect with fellow book lovers around the world.",
    status: "In Development",
  },
];

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <TbProgress className="w-4 h-4" />
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Exciting features are{" "}
              <span className="text-primary">on the way</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty">
              We're working hard to bring you new ways to discover books,
              connect with readers, and make your reading journey even more
              enjoyable.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/register">Start Reading Free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8"
              >
                <Link href="/features">Explore Current Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
              What's Coming Next
            </h2>
            <p className="text-center text-muted-foreground mb-12">
              Here's a sneak peek at the features we're building for you
            </p>

            <div className="space-y-6">
              {upcomingFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {feature.title}
                          </h3>
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                            {feature.status}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stay Updated */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Want to be the first to know?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create a free account today and we'll notify you as soon as these
              features launch. Plus, you can start tracking your reading journey
              right away!
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/register">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Current Features CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              In the meantime...
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Booktab already has powerful features to help you track your
              reading journey, set goals, and celebrate every page.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8"
              >
                <Link href="/features">View All Features</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8"
              >
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

