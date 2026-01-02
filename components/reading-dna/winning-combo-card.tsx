"use client";
import { Info, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { cn } from "@/lib/utils";

interface WinningComboProps {
  combo: {
    description: string;
    avgRating: number;
    bookCount: number;
  };
}

export function WinningComboCard({ combo }: WinningComboProps) {
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

  const tooltipContent = (
    <p className="text-xs">
      The perfect combination of genre and pacing that consistently earns your
      highest ratings. This is your reading sweet spot — books that match this
      profile are most likely to be 5-star reads for you.
    </p>
  );

  return (
    <DashboardCard
      title="Your Sweet Spot"
      description="Highest-rated book combo"
      icon={Sparkles}
      className="col-span-full lg:col-span-1"
      action={
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
      }
    >
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">{combo.description}</p>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {combo.avgRating.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Books</p>
              <p className="text-2xl font-bold text-emerald-600">
                {combo.bookCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
