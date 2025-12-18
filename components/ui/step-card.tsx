import type { LucideIcon } from "lucide-react";

interface StepCardProps {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

export function StepCard({
  step,
  icon: Icon,
  title,
  description,
}: StepCardProps) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* Step number badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg z-10">
        {step}
      </div>

      {/* Icon container */}
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
        <Icon className="w-10 h-10 text-primary" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
