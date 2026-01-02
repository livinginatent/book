"use client";

import { ArrowLeft,  Dna, CircleGauge } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { VelocityInsightsClient } from "@/components/insights/velocity";
import { ReadingDNAClient } from "@/components/insights/reading-dna";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

export default function AdvancedInsightsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDNAOpen, setIsDNAOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-foreground">Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Global Loading Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl  mx-auto px-4 py-8">
        {/* Velocity Section */}
        <CollapsibleSection
          className="mb-4"
          title="Reading Velocity"
          description="Your productivity command center"
          defaultOpen={true}
          icon={CircleGauge}
          headerContent={
            <>
              {/* Description Card */}
              <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
                <p className="text-sm text-foreground leading-relaxed">
                  This dashboard focuses on <strong>how</strong> you read, not
                  just what you read. Track your reading pace with the{" "}
                  <span className="text-primary">Velocity Engine</span>,
                  maintain momentum with the{" "}
                  <span className="text-primary">Streak Counter</span>,
                  visualize your consistency with the{" "}
                  <span className="text-primary">Activity Heatmap</span>, and
                  see exactly when you&apos;ll finish your current books with
                  the <span className="text-primary">Completion Forecast</span>.
                </p>
              </div>

              {/* Quick Stats Row */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 ">
                  <span className="text-sm font-medium">
                    30-Day Rolling Average
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 ">
                  <span className="text-sm font-medium">
                    Don&apos;t Break the Chain
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 ">
                  <span className="text-sm font-medium">12-Month History</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 ">
                  <span className="text-sm font-medium">Smart Predictions</span>
                </div>
              </div>
            </>
          }
        >
          <VelocityInsightsClient onLoadingChange={setIsLoading} />
        </CollapsibleSection>

        {/* Reading DNA Section */}
        <CollapsibleSection
          className="mb-4 rounded-lg"
          title="Reading DNA"
          description="Discover your unique reading identity"
          defaultOpen={false}
          icon={Dna}
          onOpenChange={setIsDNAOpen}
          headerContent={
            <>
              {/* Description Card */}
              <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
                <p className="text-sm text-foreground leading-relaxed">
                  Your <span className="text-primary">Reading DNA</span> reveals
                  the patterns, preferences, and characteristics that define
                  your reading journey. Explore your{" "}
                  <span className="text-primary">structural preferences</span>,
                  discover your{" "}
                  <span className="text-primary">winning combinations</span>,
                  analyze your{" "}
                  <span className="text-primary">genre landscape</span>, and see
                  how pacing and complexity affect your satisfaction.
                </p>
              </div>

              {/* Quick Stats Row */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600">
                  <span className="text-sm font-medium">
                    Preference Analysis
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600">
                  <span className="text-sm font-medium">Genre Insights</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600">
                  <span className="text-sm font-medium">Format Diversity</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600">
                  <span className="text-sm font-medium">DNA Profile</span>
                </div>
              </div>
            </>
          }
        >
          <ReadingDNAClient isOpen={isDNAOpen} onLoadingChange={setIsLoading} />
        </CollapsibleSection>
      </main>
    </div>
  );
}
