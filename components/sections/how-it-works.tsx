"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Search, BookPlus } from "lucide-react";
import { IoStatsChart, IoSparkles } from "react-icons/io5";

interface Step {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Search,
    title: "Find your books or import them",
    description:
      "You can import your books from other sites or search our library of millions of titles. Add any book you've read, are reading, or want to read.",
  },
  {
    icon: BookPlus,
    title: "Build your shelves",
    description:
      "Organize your collection your way. Create custom shelves, add tags, and track your reading progress. You'll also have default shelves like 'Currently Reading', 'Want to Read', etc. ",
  },
  {
    icon: IoStatsChart,
    title: "Watch your stats grow",
    description:
      "See beautiful charts of your reading habits. Track streaks, set goals, and celebrate milestones.",
  },
  {
    icon: IoSparkles,
    title: "Get recommendations",
    description:
      "Discover your next favorite read. Our smart suggestions learn from your taste and reading history.",
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlay]);

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your reading journey in four simple steps. Build your digital
            library and discover your next favorite book.
          </p>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Interactive timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20"></div>

            {/* Steps */}
            <div className="space-y-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;

                return (
                  <div
                    key={index}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      setActiveStep(index);
                      setIsAutoPlay(false);
                    }}
                    onMouseEnter={() => setIsAutoPlay(false)}
                    onMouseLeave={() => setIsAutoPlay(true)}
                  >
                    {/* Animated circle */}
                    <div className="absolute left-0 top-0 w-16 h-16 flex items-center justify-center">
                      <div
                        className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                          isActive
                            ? "bg-primary/20 border-primary scale-100"
                            : "bg-card border-border scale-100 group-hover:scale-110"
                        }`}
                      ></div>

                      {/* Pulse effect for active */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse"></div>
                      )}

                      {/* Icon */}
                      <Icon
                        className={`relative z-10 transition-all duration-300 ${
                          isActive
                            ? "text-primary scale-100 w-7 h-7"
                            : "text-muted-foreground w-6 h-6 group-hover:text-foreground"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div
                      className={`ml-24 pt-2 transition-all duration-300 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-60 group-hover:opacity-80"
                      }`}
                    >
                      <h3
                        className={`text-lg font-semibold transition-colors duration-300 ${
                          isActive ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs">
                        {step.description}
                      </p>
                    </div>

                    {/* Step number indicator */}
                    <div className="absolute -left-6 top-1 text-xs font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Visual showcase */}
          <div className="relative">
            {/* Card showcase */}
            <div className="relative h-96 perspective">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;

                return (
                  <div
                    key={index}
                    className={`absolute inset-0 rounded-2xl border border-border bg-card/50 backdrop-blur-md p-8 flex flex-col justify-center transition-all duration-500 ${
                      isActive
                        ? "opacity-100 scale-100 z-10"
                        : "opacity-0 scale-95 -z-10"
                    }`}
                  >
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Icon className="w-10 h-10 text-primary" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-center text-foreground mb-4">
                      {step.title}
                    </h3>

                    <p className="text-center text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>

                    {/* Decorative elements */}
                    <div className="absolute top-4 right-4 text-4xl opacity-10">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Indicator dots */}
            <div className="flex justify-center gap-3 mt-8">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActiveStep(index);
                    setIsAutoPlay(false);
                  }}
                  className={`transition-all duration-300 ${
                    index === activeStep
                      ? "w-8 h-2 bg-primary rounded-full"
                      : "w-2 h-2 bg-border rounded-full hover:bg-muted-foreground"
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <button
            onClick={() => {
              const element = document.getElementById("pricing");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity duration-300"
          >
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
}
