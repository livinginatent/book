"use client";

import { BookMarked, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { DashboardCard } from "@/components/ui/dashboard-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StructuralPreferencesProps {
  structuralFlags: Array<{
    key: string;
    percentage: number;
  }>;
}

// Map attribute keys to display labels matching book-review-form.tsx
const ATTRIBUTE_LABELS: Record<string, string> = {
  plot_driven: "Plot-Driven",
  character_development: "Character Development",
  diverse_cast: "Diverse Cast",
  multiple_pov: "Multiple POV",
  world_building: "World-Building",
  twist_ending: "Twist Ending",
  strong_prose: "Strong Prose",
};

export function StructuralPreferencesCard({
  structuralFlags,
}: StructuralPreferencesProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || !open) {
      justOpenedRef.current = false;
      return;
    }

    // Delay handler registration to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      justOpenedRef.current = false;
    }, 100);

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      // Ignore if we just opened
      if (justOpenedRef.current) return;

      const target = e.target as HTMLElement;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    // Use capture phase and delay to avoid immediate firing
    const delayedHandler = (e: MouseEvent | TouchEvent) => {
      setTimeout(() => handleClickOutside(e), 0);
    };

    document.addEventListener("mousedown", delayedHandler, true);
    document.addEventListener("touchstart", delayedHandler, true);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", delayedHandler, true);
      document.removeEventListener("touchstart", delayedHandler, true);
    };
  }, [isMobile, open]);

  // Filter and sort flags by percentage (highest first)
  const sortedFlags = structuralFlags
    .filter((flag) => ATTRIBUTE_LABELS[flag.key])
    .sort((a, b) => b.percentage - a.percentage);

  const tooltipContent = (
    <p className="text-xs">
      The structural elements you gravitate toward in books. These percentages
      show how often you encounter and enjoy specific narrative features across
      your reading history.
    </p>
  );

  const infoTooltip = (
    <div className="relative">
      {isMobile ? (
        <>
          <button
            ref={buttonRef}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!open) {
                justOpenedRef.current = true;
              }
              setOpen((prev) => !prev);
            }}
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
          {/* Mobile: Simple positioned div */}
          {open && (
            <div
              ref={tooltipRef}
              data-mobile-tooltip
              className={cn(
                "absolute z-[100] w-64 p-3 rounded-md shadow-lg",
                "bg-foreground text-background text-xs",
                "animate-in fade-in-0 zoom-in-95",
                "right-0 top-full mt-2"
              )}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {tooltipContent}
              <div className="absolute -top-1 right-4 w-2 h-2 bg-foreground rotate-45" />
            </div>
          )}
        </>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  if (sortedFlags.length === 0) {
    return (
      <DashboardCard
        title="Structural Preferences"
        description="Your reading identity"
        icon={BookMarked}
        action={infoTooltip}
      >
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No preference data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Structural Preferences"
      description="Your reading identity"
      icon={BookMarked}
      action={infoTooltip}
    >
      <div className="space-y-4">
        {sortedFlags.map((flag) => {
          const label = ATTRIBUTE_LABELS[flag.key] || flag.key;
          const percentage = Math.round(flag.percentage);

          return (
            <div key={flag.key}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
                <span className="text-sm font-semibold text-accent">
                  {percentage}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
