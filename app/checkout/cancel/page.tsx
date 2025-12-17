"use client";

import { ArrowLeft, XCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-muted/50 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-muted/50 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative text-center">
        {/* Icon */}
        <div className="relative mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Payment cancelled
          </h1>

          <p className="text-muted-foreground max-w-sm mx-auto">
            No worries! Your payment was cancelled and you haven&apos;t been
            charged. You can try again whenever you&apos;re ready.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/checkout">
            <Button
              className={cn(
                "w-full h-12 text-base font-semibold rounded-xl",
                "bg-gradient-to-r from-primary to-primary/90",
                "text-primary-foreground",
                "shadow-lg shadow-primary/25",
                "hover:shadow-xl hover:shadow-primary/30",
                "transition-all duration-300"
              )}
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try again
            </Button>
          </Link>

          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center w-full h-12 rounded-xl",
              "border-2 border-border hover:border-primary/30",
              "text-foreground font-semibold",
              "hover:bg-muted/50",
              "transition-all duration-300",
              "group"
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>
        </div>

        {/* Help text */}
        <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            Having trouble? Feel free to{" "}
            <Link href="/support" className="text-primary hover:underline">
              contact support
            </Link>{" "}
            and we&apos;ll help you out.
          </p>
        </div>
      </div>
    </div>
  );
}

