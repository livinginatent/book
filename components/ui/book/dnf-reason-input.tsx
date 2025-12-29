"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DNFReasonInputProps {
  onConfirm: (reason: string | null) => void;
  onCancel: () => void;
  className?: string;
}

const QUICK_REASONS = [
  "Too Slow",
  "Writing Style",
  "Lost Interest",
  "Too Complex",
  "Characters",
  "Plot Issues",
];

export function DNFReasonInput({
  onConfirm,
  onCancel,
  className,
}: DNFReasonInputProps) {
  const [dnfReason, setDnfReason] = useState("");

  const handleConfirm = () => {
    const trimmedReason = dnfReason.trim();
    onConfirm(trimmedReason || null);
  };

  const handleCancel = () => {
    setDnfReason("");
    onCancel();
  };

  return (
    <div className={cn("p-4 border-t border-border bg-muted/30", className)}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Why did you stop reading?{" "}
            <span className="text-muted-foreground font-normal">
              (Optional)
            </span>
          </label>

          {/* Quick Select Reasons */}
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-2">Quick select:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setDnfReason(reason)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                    dnfReason === reason
                      ? "bg-primary/20 text-primary border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Textarea */}
          <textarea
            value={dnfReason}
            onChange={(e) => setDnfReason(e.target.value)}
            placeholder="Or write your own reason..."
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            This will help you remember why you stopped if you decide to try
            again later.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleConfirm}
            size="sm"
            className="flex-1 rounded-xl"
          >
            Mark as DNF
          </Button>
          <Button
            onClick={handleCancel}
            size="sm"
            variant="outline"
            className="flex-1 rounded-xl"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

