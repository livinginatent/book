"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormMessageProps {
  type: "error" | "success";
  message: string;
  className?: string;
}

export function FormMessage({ type, message, className }: FormMessageProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-1 duration-200",
        type === "error" &&
          "bg-destructive/10 text-destructive border border-destructive/20",
        type === "success" &&
          "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
        className
      )}
    >
      {type === "error" ? (
        <AlertCircle className="w-4 h-4 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

