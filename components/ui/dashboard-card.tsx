import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import type React from "react";

import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  locked?: boolean;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  locked = false,
  children,
  className,
  action,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "relative p-5 rounded-2xl bg-card border border-border transition-all duration-300",
        locked
          ? "opacity-60"
          : "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        className
      )}
    >
      {locked && (
        <div className="absolute inset-0 bg-card/50 backdrop-blur-[1px] rounded-2xl z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Bibliophile Feature
            </span>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
