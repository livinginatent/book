"use client";

import { Loader2 } from "lucide-react";

import { useShelfLoadingOptional } from "@/hooks/use-shelf-loading";
import { cn } from "@/lib/utils";

export function GlobalSpinner() {
  const loading = useShelfLoadingOptional();

  if (!loading?.isLoading) return null;

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50",
        "flex items-center gap-2 px-4 py-2",
        "bg-background/95 backdrop-blur-sm",
        "border border-border rounded-full shadow-lg",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      {loading.loadingMessage && (
        <span className="text-sm text-muted-foreground">
          {loading.loadingMessage}
        </span>
      )}
    </div>
  );
}

