"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordStrength } from "@/lib/validations/auth";

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const { score, label, color, requirements } = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span
            className={cn(
              "font-medium",
              score <= 2 && "text-destructive",
              score === 3 && "text-orange-500",
              score === 4 && "text-yellow-600",
              score === 5 && "text-green-500"
            )}
          >
            {label}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300",
                i <= score ? color : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 gap-1.5">
          {requirements.map((req, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 text-xs transition-all duration-200",
                req.met ? "text-green-600" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200",
                  req.met
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-muted"
                )}
              >
                {req.met ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <X className="w-3 h-3" />
                )}
              </div>
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

