"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "default" | "outline";
  className?: string;
}

export function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "outline",
  className,
}: QuickActionButtonProps) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 h-auto py-4 px-6 rounded-xl",
        "transition-all duration-300 hover:-translate-y-1",
        className
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}
