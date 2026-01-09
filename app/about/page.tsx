/* eslint-disable react/no-unescaped-entities */
import {
  BookHeart,
  Heart,

 
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiAntdesign } from "react-icons/si";

import { Button } from "@/components/ui/button";
export const metadata: Metadata = {
  title: "About Booktab | The Minimalist Book Tracker for Readers",
  description:
    "Discover Booktab, the book tracking app designed for focus and delight. Our mission is to provide the best reading tracking experience without the social pressure.",
  keywords: [
    "book tracker app",
    "reading tracking software",
    "digital reading log",
    "booktab mission",
    "track reading progress",
  ],
  openGraph: {
    title: "About Booktab | Reimagining Reading Tracking",
    description:
      "Learn how Booktab is making book tracking simple, private, and joyful for readers everywhere.",
    type: "website",
  },
};



const values = [
  {
    icon: Heart,
    title: "Focus on the Journey",
    description:
      "Most book trackers focus on the finish line. We celebrate the daily habit, the middle chapters, and the consistent progress.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy by Design",
    description:
      "Your reading list is personal. We don't sell your data or force social features on you. Your library stays yours.",
  },
  {
    icon: SiAntdesign,
    title: "Minimalist Interface",
    description:
      "A book tracker should get out of your way. Our UI is designed to be fast, clean, and completely ad-free.",
  },
  {
    icon: BarChart3,
    title: "Actionable Insights",
    description:
      "Understand your reading habits with beautiful analytics that help you find more time for the books you love.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6">
              <BookHeart className="w-3.5 h-3.5" />
              Our Mission
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              The <span className="text-primary">book tracker</span> you’ll
              actually enjoy using.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Booktab was born out of a simple need: a reading tracker that felt
              like a sanctuary, not a chore. We’ve built a home for your library
              that prioritizes mindfulness over metrics.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="rounded-full px-8 shadow-lg shadow-primary/20"
              >
                <Link href="/register">Start Your Library</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Subtle decorative background element */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-0" />
      </section>

 

      {/* Story Section - Split Layout */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-5xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why we built a better <br />
                <span className="text-primary">reading tracking</span>{" "}
                experience.
              </h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  For years, we used tools that made reading feel like a
                  competitive sport. The focus was always on "how many" rather
                  than "how well."
                </p>
                <p>
                  We believed that reading tracking should be a tool for
                  reflection. Whether you're a casual reader or a bibliophile,
                  Booktab is designed to help you organize your digital library
                  without the noise of social media or intrusive ads.
                </p>
                <p className="text-foreground font-medium  border-l-4 border-primary pl-4">
                  Our goal isn't to make you read more—it's to help you enjoy
                  the books you're already reading.
                </p>
              </div>
            </div>
            <div className="bg-primary/5 rounded-3xl p-8 aspect-square flex items-center justify-center relative">
              {/* This represents where a product screenshot or illustration would go */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className="relative text-center space-y-4">
                <div className="bg-background p-6 rounded-2xl shadow-xl border border-border max-w-[280px]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full" />
                    <div className="space-y-1">
                      <div className="w-24 h-2 bg-foreground/20 rounded" />
                      <div className="w-16 h-2 bg-foreground/10 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-primary/10 rounded" />
                    <div className="w-full h-3 bg-primary/10 rounded" />
                    <div className="w-3/4 h-3 bg-primary/10 rounded" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-primary uppercase">
                  Simple. Clean. Focused.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section - Grid */}
      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What makes us different
              </h2>
              <p className="text-muted-foreground text-lg">
                The principles that guide our development and your experience.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div
                    key={value.title}
                    className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

     
    </div>
  );
}
