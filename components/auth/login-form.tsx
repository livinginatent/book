"use client";

import { Eye, EyeOff, User, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loginSchema } from "@/lib/validations/auth";

interface LoginFormProps {
  initialMessage?: string;
  initialError?: string;
  initialRedirect?: string;
}

export function LoginForm({ 
  initialMessage, 
  initialError, 
  initialRedirect 
}: LoginFormProps = {}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Use props passed from server component
  const successMessage = initialMessage;
  const errorMessage = initialError;
  const redirectTo = initialRedirect;

  const getSuccessText = () => {
    switch (successMessage) {
      case "password-updated":
        return "Your password has been updated. Please sign in with your new password.";
      case "email-verified":
        return "Your email has been verified. You can now sign in.";
      default:
        return null;
    }
  };

  const validateField = (field: string, value: string) => {
    const data = { identifier, password, [field]: value };
    const result = loginSchema.safeParse(data);
    
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return errors[field as keyof typeof errors] || [];
    }
    return [];
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validateField(field, field === "identifier" ? identifier : password);
    setFieldErrors((prev) => ({ ...prev, [field]: errors }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    const response = await signIn({ identifier, password }, redirectTo);

    if (response?.error) {
      setError(response.error);
      setLoading(false);
    } else if (response?.errors) {
      setFieldErrors(response.errors);
      setLoading(false);
    }
    // If successful, the server action will redirect
  };

  const successText = getSuccessText();

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to continue your reading journey
          </p>
        </div>

        {/* Success message */}
        {successText && (
          <FormMessage type="success" message={successText} />
        )}

        {/* Error message from URL */}
        {errorMessage && !error && (
          <FormMessage type="error" message={decodeURIComponent(errorMessage)} />
        )}

        {/* Redirect notice */}
        {redirectTo === "/checkout" ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Sign in to continue to checkout
              </p>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be redirected to complete your Bibliophile subscription
              </p>
            </div>
          </div>
        ) : redirectTo ? (
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground">
            Please sign in to access that page.
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global error */}
          {error && <FormMessage type="error" message={error} />}

          {/* Email or Username field */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium">
              Email or Username
            </label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (touched.identifier) {
                  const errors = validateField("identifier", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, identifier: errors }));
                }
              }}
              onBlur={() => handleBlur("identifier")}
              placeholder="you@example.com or username"
              icon={<User className="w-4 h-4" />}
              error={fieldErrors.identifier?.[0]}
              disabled={loading}
              autoComplete="username"
            />
            {touched.identifier && fieldErrors.identifier?.[0] && (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {fieldErrors.identifier[0]}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
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
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
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
            {touched.password && fieldErrors.password?.[0] && (
              <p className="text-xs text-destructive animate-in fade-in slide-in-from-top-1">
                {fieldErrors.password[0]}
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
                Sign in
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              New to Bookly?
            </span>
          </div>
        </div>

        {/* Sign up link */}
        <div className="text-center">
          <Link
            href="/register"
            className={cn(
              "inline-flex items-center justify-center w-full h-12 rounded-xl",
              "border-2 border-primary/20 hover:border-primary/40",
              "text-primary font-semibold",
              "hover:bg-primary/5",
              "transition-all duration-300",
              "group"
            )}
          >
            Create an account
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
