import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

import { VelocityInsightsClient } from "@/components/insights/velocity";

export default function AdvancedInsightsPage() {
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
            <h1 className="font-semibold text-foreground">
              Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Reading Velocity
              </h2>
              <p className="text-sm text-muted-foreground">
                Your productivity command center
              </p>
            </div>
          </div>

          {/* Description Card */}
          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
            <p className="text-sm text-foreground leading-relaxed">
              This dashboard focuses on <strong>how</strong> you read, not just
              what you read. Track your reading pace with the{" "}
              <span className="text-primary">Velocity Engine</span>, maintain
              momentum with the{" "}
              <span className="text-primary">Streak Counter</span>, visualize
              your consistency with the{" "}
              <span className="text-primary">Activity Heatmap</span>, and see
              exactly when you'll finish your current books with the{" "}
              <span className="text-primary ">
                Completion Forecast
              </span>
              .
            </p>
          </div>

          {/* Quick Stats Row */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <span className="text-sm font-medium">
                30-Day Rolling Average
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <span className="text-sm font-medium">Don't Break the Chain</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <span className="text-sm font-medium">12-Month History</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <span className="text-sm font-medium">Smart Predictions</span>
            </div>
          </div>
        </div>

        {/* Velocity Content */}
        <VelocityInsightsClient />
      </main>
    </div>
  );
}
