"use client";
import { BookOpen, Info } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { cn } from "@/lib/utils";

interface FormatDiversityProps {
  formats: {
    physical: number;
    digital: number;
    audiobook: number;
  };
  diverseCastPercent: number;
}

export function FormatDiversityCard({
  formats,
  diverseCastPercent,
}: FormatDiversityProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const justOpenedRef = useRef(false);
  const total = formats.physical + formats.digital + formats.audiobook;

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

  const tooltipContent = (
    <p className="text-xs">
      Your reading format distribution shows how you prefer to consume books.
      The diverse cast percentage reflects the inclusivity of characters in
      your library.
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

  if (total === 0) {
    return (
      <DashboardCard
        title="Format & Diversity"
        description="How you read and inclusivity"
        icon={BookOpen}
        action={infoTooltip}
      >
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No format data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Format & Diversity"
      description="How you read and inclusivity"
      icon={BookOpen}
      action={infoTooltip}
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Physical Books
            </span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.physical / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.physical / total) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">E-books</span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.digital / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.digital / total) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Audiobooks
            </span>
            <span className="text-sm font-semibold text-accent">
              {Math.round((formats.audiobook / total) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(formats.audiobook / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">
              Diverse Cast
            </span>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-600">
                {diverseCastPercent}%
              </p>
              <p className="text-xs text-muted-foreground">of your library</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
