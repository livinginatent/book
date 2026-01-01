"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  headerContent?: React.ReactNode;
  className?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  icon: Icon,
  headerContent,
  className,
  onOpenChange,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  function handleToggle() {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  }

  return (
    <div
      className={cn(
        "transition-all",
        !isOpen && "rounded-2xl bg-card border border-border",
        className
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors",
          !isOpen && "rounded-2xl"
        )}
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </button>
      {headerContent && isOpen && (
        <div className="px-6 pb-4">{headerContent}</div>
      )}
      {isOpen && (
        <div className="px-6 pb-8 animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

