import { Sparkles, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UpgradeBannerProps {
  className?: string;
}

export function UpgradeBanner({ className }: UpgradeBannerProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Upgrade to Bibliophile</h3>
            <p className="text-primary-foreground/80 text-sm">
              Unlock advanced insights, mood tracking, and unlimited shelves
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          className="shrink-0 bg-white text-primary hover:bg-white/90 rounded-xl"
        >
          Upgrade Now
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
