"use client";

import { ArrowRight, CheckCircle2, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { cn } from "@/lib/utils";

export default function CheckoutSuccessPage() {
  // Clear any stored plan intent
  useEffect(() => {
    sessionStorage.removeItem("pendingPlan");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-green-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative text-center">
        {/* Success animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-green-500/20 animate-ping opacity-50" />
          </div>
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/25">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Bibliophile
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Bibliophile!
          </h1>

          <p className="text-muted-foreground max-w-sm mx-auto">
            Your subscription is now active. You have full access to all premium
            features. Time to take your reading journey to the next level!
          </p>
        </div>

        {/* Features unlocked */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            You&apos;ve unlocked:
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Advanced reading insights</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Mood & pace tracking</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Unlimited private shelves</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>Priority recommendations</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center justify-center w-full h-12 rounded-xl",
              "bg-gradient-to-r from-primary to-primary/90",
              "text-primary-foreground font-semibold",
              "shadow-lg shadow-primary/25",
              "hover:shadow-xl hover:shadow-primary/30",
              "transition-all duration-300",
              "group"
            )}
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Start exploring
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="text-xs text-muted-foreground">
            A confirmation email has been sent to your inbox
          </p>
        </div>
      </div>
    </div>
  );
}

