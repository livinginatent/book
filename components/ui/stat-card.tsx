import type { LucideIcon } from "lucide-react";
import type { IconType } from "react-icons";

import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon | IconType;
  value: string;
  label: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl bg-card border border-border",
        className
      )}
    >
      <div className="w-12 h-12 text-primary rounded-xl  flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
