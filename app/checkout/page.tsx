"use client";

import { ArrowLeft, CreditCard, Shield, Sparkles, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const features = [
  "Advanced reading insights",
  "Mood & pace tracking",
  "Unlimited private shelves",
  "Priority book recommendations",
  "Export your data anytime",
  "Early access to new features",
];

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!user) {
      setError("Please sign in to continue");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Main card */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Upgrade to Bibliophile
            </h1>
            <p className="text-muted-foreground mt-2">
              Unlock the full reading experience
            </p>
          </div>

          {/* Price */}
          <div className="text-center mb-8 p-6 rounded-2xl bg-secondary/50">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-foreground">$4.99</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Cancel anytime · No commitments
            </p>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">
              What&apos;s included:
            </h3>
            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" strokeWidth={3} />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error message */}
          {error && <FormMessage type="error" message={error} className="mb-4" />}

          {/* Checkout button */}
          <div className="space-y-4">
            {authLoading ? (
              <Button
                disabled
                className={cn(
                  "w-full h-12 text-base font-semibold rounded-xl",
                  "bg-gradient-to-r from-primary to-primary/90",
                  "text-primary-foreground"
                )}
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </Button>
            ) : !user ? (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  Please sign in to continue
                </p>
                <Link href="/login?redirect=/checkout">
                  <Button
                    className={cn(
                      "w-full h-12 text-base font-semibold rounded-xl",
                      "bg-gradient-to-r from-primary to-primary/90",
                      "text-primary-foreground"
                    )}
                  >
                    Sign in to upgrade
                  </Button>
                </Link>
              </div>
            ) : (
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className={cn(
                  "w-full h-12 text-base font-semibold rounded-xl",
                  "bg-gradient-to-r from-primary to-primary/90",
                  "text-primary-foreground",
                  "shadow-lg shadow-primary/25",
                  "hover:shadow-xl hover:shadow-primary/30",
                  "transition-all duration-300"
                )}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Continue to payment
                  </>
                )}
              </Button>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secure payment powered by Dodo Payments</span>
            </div>
          </div>
        </div>

        {/* Skip option */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Not ready to upgrade?{" "}
          <Link href="/" className="text-primary hover:underline font-medium">
            Continue with free plan
          </Link>
        </p>
      </div>
    </div>
  );
}
