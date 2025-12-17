"use client";

import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  BookOpenText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { cn } from "@/lib/utils";
import { registerSchema } from "@/lib/validations/auth";

type FormState = "form" | "success";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const isPaidPlan = plan === "bibliophile";

  const [formState, setFormState] = useState<FormState>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Store plan intent in sessionStorage for after registration
  useEffect(() => {
    if (isPaidPlan) {
      sessionStorage.setItem("pendingPlan", "bibliophile");
    }
  }, [isPaidPlan]);

  const validateField = (field: string, value: string) => {
    const data = { email, password, confirmPassword, [field]: value };
    const result = registerSchema.safeParse(data);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return errors[field as keyof typeof errors] || [];
    }
    return [];
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value =
      field === "email"
        ? email
        : field === "password"
        ? password
        : confirmPassword;
    const errors = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: errors }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const result = registerSchema.safeParse({
      email,
      password,
      confirmPassword,
    });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    const response = await signUp({ email, password, confirmPassword });

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
              <div
                className={cn(
                  "w-32 h-32 rounded-full animate-ping opacity-50",
                  isPaidPlan
                    ? "bg-primary/20"
                    : "bg-green-100 dark:bg-green-900/30"
                )}
              />
            </div>
            <div
              className={cn(
                "relative inline-flex items-center justify-center w-24 h-24 rounded-full shadow-xl",
                isPaidPlan
                  ? "bg-gradient-to-br from-primary to-primary/80 shadow-primary/25"
                  : "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/25"
              )}
            >
              {isPaidPlan ? (
                <Sparkles className="w-12 h-12 text-white" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-white" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isPaidPlan ? "Almost there!" : "Check your email"}
            </h1>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {isPaidPlan ? (
                <>
                  We&apos;ve sent a verification link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Complete checkout to unlock all Bibliophile features.
                </>
              ) : (
                <>
                  We&apos;ve sent a verification link to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Click the link to activate your account.
                </>
              )}
            </p>
          </div>

          <div className="space-y-4">
            {isPaidPlan ? (
              <>
                <Link
                  href="/checkout"
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
                  Continue to checkout
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <p className="text-xs text-muted-foreground">
                  You can also verify your email first, then upgrade later
                </p>
              </>
            ) : (
              <>
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
                    "bg-gradient-to-r from-primary to-primary/90",
                    "text-primary-foreground font-semibold",
                    "shadow-lg shadow-primary/25",
                    "hover:shadow-xl hover:shadow-primary/30",
                    "transition-all duration-300",
                    "group"
                  )}
                >
                  Continue to sign in
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className={cn(
              "inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4",
              isPaidPlan
                ? "bg-gradient-to-br from-primary to-primary/80 shadow-primary/25"
                : "bg-gradient-to-br from-accent to-accent/80 shadow-accent/25"
            )}
          >
            {isPaidPlan ? (
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            ) : (
              <BookOpenText className="w-8 h-8 text-accent-foreground" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isPaidPlan ? "Join Bibliophile" : "Create an account"}
          </h1>
          <p className="text-muted-foreground">
            {isPaidPlan
              ? "Create your account, then complete checkout"
              : "Start tracking your reading journey today"}
          </p>
        </div>

        {/* Paid plan notice */}
        {isPaidPlan && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Bibliophile Plan
              </p>
              <p className="text-xs text-muted-foreground">
                $4.99/month · You&apos;ll complete payment after signup
              </p>
            </div>
          </div>
        )}

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

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (touched.password) {
                  const errors = validateField("password", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, password: errors }));
                }
              }}
              onBlur={() => handleBlur("password")}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              error={fieldErrors.password?.[0]}
              disabled={loading}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />
            {/* Password strength indicator */}
            <PasswordStrength password={password} />
            {touched.password && fieldErrors.password?.[0] && (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {fieldErrors.password[0]}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (touched.confirmPassword) {
                  const errors = validateField(
                    "confirmPassword",
                    e.target.value
                  );
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: errors,
                  }));
                }
              }}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              error={fieldErrors.confirmPassword?.[0]}
              disabled={loading}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              }
            />
            {touched.confirmPassword && fieldErrors.confirmPassword?.[0] && (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {fieldErrors.confirmPassword[0]}
              </p>
            )}
            {/* Password match indicator */}
            {confirmPassword && password === confirmPassword && (
              <p className="text-xs text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                <CheckCircle2 className="w-3 h-3" />
                Passwords match
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
                Create account
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>

          {/* Terms */}
          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Sign in link */}
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
            Sign in instead
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
