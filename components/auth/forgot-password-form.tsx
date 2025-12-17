"use client";

import { Mail, ArrowRight, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { forgotPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { forgotPasswordSchema } from "@/lib/validations/auth";

type FormState = "form" | "success";

export function ForgotPasswordForm() {
  const [formState, setFormState] = useState<FormState>("form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string) => {
    const data = { [field]: value };
    const result = forgotPasswordSchema.safeParse(data);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return errors[field as keyof typeof errors] || [];
    }
    return [];
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validateField(field, email);
    setFieldErrors((prev) => ({ ...prev, [field]: errors }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    const response = await forgotPassword({ email });

    if (response?.error) {
      setError(response.error);
      setLoading(false);
    } else if (response?.errors) {
      setFieldErrors(response.errors);
      setLoading(false);
    } else if (response?.success) {
      setFormState("success");
    }
  };

  // Success state
  if (formState === "success") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="relative space-y-8 text-center">
          {/* Success animation */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-primary/10 animate-ping opacity-50" />
            </div>
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/25">
              <CheckCircle2 className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">{email}</span>. Click the
              link to reset your password.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setFormState("form")}
                  className="text-primary hover:underline font-medium"
                >
                  try again
                </button>
              </p>
            </div>

            <Link
              href="/login"
              className={cn(
                "inline-flex items-center justify-center w-full h-12 rounded-xl",
                "border-2 border-primary/20 hover:border-primary/40",
                "text-primary font-semibold",
                "hover:bg-primary/5",
                "transition-all duration-300",
                "group"
              )}
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="relative space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary shadow-lg shadow-primary/25 mb-4">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
          <p className="text-muted-foreground">
            No worries, we&apos;ll send you reset instructions
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global error */}
          {error && <FormMessage type="error" message={error} />}

          {/* Email field */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (touched.email) {
                  const errors = validateField("email", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: errors }));
                }
              }}
              onBlur={() => handleBlur("email")}
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={fieldErrors.email?.[0]}
              disabled={loading}
              autoComplete="email"
            />
            {touched.email && fieldErrors.email?.[0] && (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {fieldErrors.email[0]}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className={cn(
              "w-full h-12 text-base font-semibold rounded-xl",
              "bg-gradient-to-r from-primary to-primary/90",
              "shadow-lg shadow-primary/25",
              "hover:shadow-xl hover:shadow-primary/30",
              "transition-all duration-300",
              "group"
            )}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Send reset link
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Back to login */}
        <div className="text-center">
          <Link
            href="/login"
            className={cn(
              "inline-flex items-center justify-center w-full h-12 rounded-xl",
              "border-2 border-primary/20 hover:border-primary/40",
              "text-primary font-semibold",
              "hover:bg-primary/5",
              "transition-all duration-300",
              "group"
            )}
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

