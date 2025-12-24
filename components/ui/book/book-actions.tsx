"use client";

import {
  BookMarked,
  BookOpen,
  BookX,
  ListPlus,
  Plus,
  X,
  Pause,
  CheckCircle2,
} from "lucide-react";
import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

// Hook to check if we're on the client (for portal rendering)
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export type BookAction =
  | "to-read"
  | "currently-reading"
  | "did-not-finish"
  | "up-next"
  | "paused"
  | "finished";

interface BookActionMenuProps {
  onAction: (action: BookAction) => void;
  className?: string;
}

// Actions arranged in a half-circle (like the curve of letter D)
// Angles go from 90° (top) to 270° (bottom) on the LEFT side
const actions = [
  {
    id: "did-not-finish" as BookAction,
    icon: BookX,
    label: "Did Not Finish",
    color: "bg-muted text-muted-foreground hover:bg-muted/80",
  },
  {
    id: "up-next" as BookAction,
    icon: ListPlus,
    label: "Up Next",
    color: "bg-chart-4 text-foreground hover:bg-chart-4/90",
  },
  {
    id: "currently-reading" as BookAction,
    icon: BookOpen,
    label: "Currently Reading",
    color: "bg-accent text-accent-foreground hover:bg-accent/90",
  },
  {
    id: "paused" as BookAction,
    icon: Pause,
    label: "Paused",
    color: "bg-chart-3 text-foreground hover:bg-chart-3/90",
  },
  {
    id: "finished" as BookAction,
    icon: CheckCircle2,
    label: "Finished",
    color: "bg-chart-2 text-foreground hover:bg-chart-2/90",
  },
  {
    id: "to-read" as BookAction,
    icon: BookMarked,
    label: "Want to Read",
    color: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
];

// Calculate angles for half-circle layout (D-shape, curved part on the left)
// Start from 120° (upper-left) to 240° (lower-left) = 120° arc
const START_ANGLE = 90; // degrees
const END_ANGLE = 270; // degrees
const ANGLE_STEP = (END_ANGLE - START_ANGLE) / (actions.length - 1);

export function BookActionMenu({ onAction, className }: BookActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<BookAction | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isClient = useIsClient();

  // Update menu position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, [isOpen]);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        if (!target.closest("[data-action-menu]")) {
          setIsOpen(false);
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleAction = (action: BookAction) => {
    onAction(action);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button - Larger touch target on mobile */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
          isOpen
            ? "bg-foreground text-background rotate-45"
            : "bg-primary text-primary-foreground hover:scale-110 active:scale-95"
        )}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>

      {/* Radial Action Menu - Rendered via Portal */}
      {isOpen &&
        isClient &&
        createPortal(
          <>
            {/* Menu container - Desktop only */}
            <div
              data-action-menu
              className="hidden sm:block fixed pointer-events-none"
              style={{
                left: menuPosition.x,
                top: menuPosition.y,
                zIndex: 9999,
              }}
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                const radius = 70; // Fixed radius for desktop
                // Calculate angle for this action in the half-circle
                const angle = START_ANGLE + index * ANGLE_STEP;
                const angleRad = (angle * Math.PI) / 180;
                const x = Math.cos(angleRad) * radius;
                const y = Math.sin(angleRad) * radius;

                return (
                  <div
                    key={action.id}
                    className="absolute pointer-events-auto"
                    style={{
                      left: x,
                      top: y,
                      transform: "translate(-50%, -50%)",
                      animation: `action-pop-in 0.2s ease-out ${
                        index * 0.05
                      }s both`,
                    }}
                  >
                    <button
                      onClick={() => handleAction(action.id)}
                      onMouseEnter={() => setActiveAction(action.id)}
                      onMouseLeave={() => setActiveAction(null)}
                      className={cn(
                        "w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg border border-background/20",
                        action.color,
                        "hover:scale-110 active:scale-95",
                        activeAction === action.id && "scale-110"
                      )}
                      title={action.label}
                    >
                      <Icon className="w-5 h-5 sm:w-4 h-4" />
                    </button>

                    {/* Desktop Tooltip - Hidden on mobile, shown on hover */}
                    {activeAction === action.id && (
                      <div
                        className="hidden sm:block absolute whitespace-nowrap bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg"
                        style={{
                          // Tooltips always on the right since menu is on the left
                          left: "100%",
                          marginLeft: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      >
                        {action.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>,
          document.body
        )}

      <style jsx global>{`
        @keyframes action-pop-in {
          0% {
            opacity: 0;
            scale: 0.5;
          }
          100% {
            opacity: 1;
            scale: 1;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}


