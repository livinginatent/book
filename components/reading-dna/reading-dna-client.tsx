"use client";

import { useState, useEffect, useTransition } from "react";
import { Dna } from "lucide-react";

import { getReadingDNA } from "@/app/actions/insights";
import {
  WinningComboCard,
  StructuralPreferencesCard,
  FormatDiversityCard,
  ComplexityCurveCard,
  AcquisitionIntegrityCard,
  PacingSatisfactionCard,
  GenreLandscapeCard,
  DNARadar,
} from "@/components/reading-dna";

interface ReadingDNAClientProps {
  isOpen: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

export function ReadingDNAClient({
  isOpen,
  onLoadingChange,
}: ReadingDNAClientProps) {
  const [data, setData] = useState<
    Awaited<ReturnType<typeof getReadingDNA>> | null
  >(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (isOpen && !hasFetched) {
      setHasFetched(true);
      onLoadingChange?.(true);
      startTransition(async () => {
        setError(null);
        const result = await getReadingDNA();
        if (result.success) {
          setData(result);
        } else {
          setError(result.error);
        }
        onLoadingChange?.(false);
      });
    }
  }, [isOpen, hasFetched, onLoadingChange]);

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-card border border-border text-center">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-6 w-48 bg-muted rounded mb-2" />
          <div className="h-4 w-96 bg-muted rounded mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const {
    pacingStats,
    complexity,
    subjects,
    structuralFlags,
    formats,
    diverseCastPercent,
    acquisitionData,
    winningCombo,
  } = data;

  // Calculate structural preferences
  const plotDriven =
    structuralFlags.find((f) => f.key === "plot_driven")?.percentage || 0;
  const characterDriven =
    structuralFlags.find((f) => f.key === "character_driven")?.percentage || 0;

  // Transform complexity data for chart
  const complexityData = complexity.map((c) => ({
    difficulty: c.level,
    count: c.count,
  }));

  if (!isOpen) {
    return null;
  }

  return (
    <div className="space-y-10">
      {/* Section 1: Core Preferences */}
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Core Preferences
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          What makes you tick as a reader — your structural preferences and
          winning combinations
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {winningCombo && (
            <WinningComboCard combo={winningCombo} />
          )}
          <StructuralPreferencesCard
            plotDriven={plotDriven}
            characterDriven={characterDriven}
          />
          <FormatDiversityCard
            formats={formats}
            diverseCastPercent={diverseCastPercent}
          />
        </div>
      </section>

      {/* Section 2: Reading Patterns */}
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Reading Patterns
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          How you engage with books — pacing, complexity, and genre preferences
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PacingSatisfactionCard pacingStats={pacingStats} />
          <ComplexityCurveCard data={complexityData} />
        </div>
        <div className="mt-4">
          <GenreLandscapeCard subjects={subjects} />
        </div>
      </section>

      {/* Section 3: Reading DNA Profile */}
      <section className="transition-opacity">
        <div className="flex items-center gap-2 mb-2">
          <Dna className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-foreground">
            Reading DNA Profile
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          A comprehensive view of your reading identity
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DNARadar structuralFlags={structuralFlags} />
          <AcquisitionIntegrityCard data={acquisitionData} />
        </div>
      </section>
    </div>
  );
}

