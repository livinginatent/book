"use client";

import { cn } from "@/lib/utils";
import { Check, Pause, XCircle, ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuickActionType =
  | "finished"
  | "paused"
  | "dnf"
  | "switch-edition"
  | "remove";

interface QuickActionsProps {
  onAction: (action: QuickActionType) => void;
  className?: string;
}

const actions = [
  {
    type: "finished" as QuickActionType,
    label: "Mark Finished",
    icon: Check,
    variant: "default" as const,
  },
  {
    type: "paused" as QuickActionType,
    label: "Pause",
    icon: Pause,
    variant: "secondary" as const,
  },
  {
    type: "dnf" as QuickActionType,
    label: "Did Not Finish",
    icon: XCircle,
    variant: "secondary" as const,
  },
  {
    type: "switch-edition" as QuickActionType,
    label: "Switch Edition",
    icon: ArrowRightLeft,
    variant: "outline" as const,
  },
  {
    type: "remove" as QuickActionType,
    label: "Remove",
    icon: Trash2,
    variant: "destructive" as const,
  },
];

export function QuickActions({ onAction, className }: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map(({ type, label, icon: Icon, variant }) => (
        <Button
          key={type}
          variant={variant}
          size="sm"
          onClick={() => onAction(type)}
          className="rounded-xl"
        >
          <Icon className="w-4 h-4 mr-1.5" />
          {label}
        </Button>
      ))}
    </div>
  );
}
