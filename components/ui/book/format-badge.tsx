"use client";

import { Book, Smartphone, Headphones } from "lucide-react";

import { cn } from "@/lib/utils";

export type BookFormat = "physical" | "ebook" | "audiobook";

interface FormatBadgeProps {
  format: BookFormat;
  className?: string;
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

const formatConfig = {
  physical: {
    icon: Book,
    label: "Physical",
    color: "bg-primary/10 text-primary",
  },
  ebook: {
    icon: Smartphone,
    label: "E-book",
    color: "bg-accent/10 text-accent",
  },
  audiobook: {
    icon: Headphones,
    label: "Audiobook",
    color: "bg-chart-3/20 text-chart-3",
  },
};

export function FormatBadge({
  format,
  className,
  onClick,
  selectable,
  selected,
}: FormatBadgeProps) {
  const config = formatConfig[format];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      disabled={!selectable}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
        selectable ? "cursor-pointer hover:scale-105" : "cursor-default",
        selected ? "ring-2 ring-primary ring-offset-2" : "",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </button>
  );
}


