import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  iconClassName?: string;
}

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  iconClassName,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group relative p-6 rounded-2xl bg-card border border-border",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
        "transition-all duration-300 ease-out",
        className
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
          "bg-primary/10 text-primary",
          "group-hover:bg-primary group-hover:text-primary-foreground",
          "transition-colors duration-300",
          iconClassName
        )}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
