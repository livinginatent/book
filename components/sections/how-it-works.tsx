"use client";

import { Search, BookPlus, BarChart3, Sparkles } from "lucide-react";

import { SectionHeading } from "@/components/ui/section-heading";

import { StepCard } from "../ui/step-card";



const steps = [
  {
    icon: Search,
    title: "Find your books or import them",
    description:
      "Search our library of millions of titles. Add any book you've read, are reading, or want to read.",
  },
  {
    icon: BookPlus,
    title: "Build your shelves",
    description:
      "Organize your collection your way. Create custom shelves, add tags, and track your reading progress.",
  },
  {
    icon: BarChart3,
    title: "Watch your stats grow",
    description:
      "See beautiful charts of your reading habits. Track streaks, set goals, and celebrate milestones.",
  },
  {
    icon: Sparkles,
    title: "Get recommendations",
    description:
      "Discover your next favorite read. Our smart suggestions learn from your taste and reading history.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="How it works"
          subtitle="Start your reading journey in four simple steps. No complicated setup, just pure bookish joy."
        />

        <div className="mt-16 relative">
          {/* Connector line - hidden on mobile */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Steps grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {steps.map((step, index) => (
              <StepCard
                key={step.title}
                step={index + 1}
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
