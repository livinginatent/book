import { Check, Sparkles, BookOpen, Target, BarChart3,  BookMarked,  Heart, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Features - Booktab | Reading Tracking Made Simple",
  description: "Discover all the features Booktab offers for tracking your reading journey. From unlimited book tracking to advanced reading insights, mood tracking, and smart recommendations.",
  keywords: [
    "reading tracker",
    "book tracking",
    "reading goals",
    "reading statistics",
    "book recommendations",
    "reading journal",
    "book shelves",
    "reading insights",
  ],
  openGraph: {
    title: "Features - Booktab | Reading Tracking Made Simple",
    description: "Discover all the features Booktab offers for tracking your reading journey.",
    type: "website",
  },
};

const plans = [
  {
    name: "Bookworm",
    price: "Free",
    description: "For readers who just want to track their journey",
    features: [
      "Track unlimited books",
      "Set up to 6 simple reading goals",
      "Basic reading stats",
      "Find books you might like",
      "Create custom shelves (up to 4)",
      "Rate and review books & log journal entries",
      "Migrate your books from other sites",
      "Export your data anytime"
    ],
    buttonText: "Start Reading Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Bibliophile",
    price: "$3.99",
    period: "month",
    description: "Perfect for readers who want the full experience",
    features: [
      "Everything in Bookworm",
      "Set up to 14 advanced reading goals",
      "Advanced reading insights",
      "Smart book recommendations based on your reading history",
      "Mood & pace tracking",
      "Unlimited private shelves",
      "Early access to new features",
    ],
    buttonText: "Upgrade to Bibliophile",
    href: "/register?plan=bibliophile",
    popular: true,
  },
];

const featureCategories = [
  {
    icon: BookOpen,
    title: "Book Management",
    description: "Organize and track your entire reading library",
    features: [
      "Track unlimited books across all your shelves",
      "Create custom shelves to organize your collection",
      "Import books from other platforms",
      "Export your data anytime",
      "Beautiful visual library with book covers",
    ],
  },
  {
    icon: Target,
    title: "Reading Goals",
    description: "Set goals and track your progress",
    features: [
      "Set up to 6 simple reading goals (Free)",
      "Set up to 14 advanced reading goals (Premium)",
      "Track yearly reading challenges",
      "Visual progress indicators",
      "Celebrate milestones and achievements",
    ],
  },
  {
    icon: BarChart3,
    title: "Reading Analytics",
    description: "Understand your reading habits with detailed insights",
    features: [
      "Basic reading statistics (Free)",
      "Advanced reading insights (Premium)",
      "Track pages read over time",
      "Genre and author analytics",
      "Reading velocity and pace tracking",
    ],
  },
  {
    icon: Sparkles,
    title: "Smart Recommendations",
    description: "Discover your next favorite read",
    features: [
      "Find books you might like (Free)",
      "Smart recommendations based on reading history (Premium)",
      "Personalized book suggestions",
      "Discover new genres and authors",
    ],
  },
  {
    icon: Heart,
    title: "Reading Journal",
    description: "Capture your thoughts and feelings about books",
    features: [
      "Rate and review books",
      "Log journal entries",
      "Track reading mood (Premium)",
      "Record reading pace (Premium)",
      "Reflect on your reading journey",
    ],
  },
  {
    icon: BookMarked,
    title: "Custom Shelves",
    description: "Organize your collection your way",
    features: [
      "Create up to 4 custom shelves (Free)",
      "Unlimited private shelves (Premium)",
      "Organize by genre, mood, or any category",
      "Private and public shelf options",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Everything you need to{" "}
              <span className="text-primary">love reading again</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty">
              Booktab makes reading tracking feel less like homework and more
              like a hobby. Discover all the features that help you celebrate
              every page.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/register">Start Tracking Free</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8"
              >
                <Link href="#pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Powerful features for every reader"
            subtitle="Whether you're a casual reader or a bookworm, we have the tools you need to track and celebrate your reading journey."
          />

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.title}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {category.title}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                        <span className="text-sm text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section id="pricing" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Choose your reading adventure"
            subtitle="Start free, upgrade when you're ready. No pressure, just pages."
          />

          <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col p-8 rounded-3xl bg-card border-2 transition-all ${
                  plan.popular
                    ? "border-primary shadow-xl shadow-primary/10 scale-105"
                    : "border-border hover:border-primary/30 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      <Zap className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.popular
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full h-12 rounded-xl font-semibold ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  }`}
                >
                  <Link href={plan.href}>{plan.buttonText}</Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-muted-foreground mt-8 text-sm">
            Cancel anytime. We believe in happy readers, not locked-in ones.
          </p>
        </div>
      </section>


    </div>
  );
}

