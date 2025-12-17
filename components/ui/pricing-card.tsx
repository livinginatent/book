import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  buttonText: string;
  href: string;
  popular?: boolean;
  className?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  href,
  popular = false,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col p-8 rounded-3xl bg-card border-2",
        "transition-all duration-300 ease-out",
        popular
          ? "border-primary shadow-xl shadow-primary/10 scale-105"
          : "border-border hover:border-primary/30 hover:shadow-lg hover:-translate-y-1",
        className
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">{price}</span>
          {period && <span className="text-muted-foreground">/{period}</span>}
        </div>
      </div>

      <ul className="flex-1 space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                popular
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground"
              )}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className="text-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        className={cn(
          "w-full h-12 rounded-xl font-semibold text-base",
          popular
            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
            : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
        )}
      >
        <Link href={href}>{buttonText}</Link>
      </Button>
    </div>
  );
}
