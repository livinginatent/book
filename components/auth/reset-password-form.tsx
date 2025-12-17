"use client";

import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { cn } from "@/lib/utils";
import { resetPasswordSchema } from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string) => {
    const data = { password, confirmPassword, [field]: value };
    const result = resetPasswordSchema.safeParse(data);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return errors[field as keyof typeof errors] || [];
    }
    return [];
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === "password" ? password : confirmPassword;
    const errors = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: errors }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    setLoading(true);

    const response = await resetPassword({ password, confirmPassword });

    if (response?.error) {
      setError(response.error);
      setLoading(false);
    } else if (response?.errors) {
      setFieldErrors(response.errors);
      setLoading(false);
    }
    // If successful, the server action will redirect
  };

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/80 shadow-lg shadow-accent/25 mb-4">
            <ShieldCheck className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Set new password</h1>
          <p className="text-muted-foreground">
            Create a strong password for your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Global error */}
          {error && <FormMessage type="error" message={error} />}

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New Password
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
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (touched.confirmPassword) {
                  const errors = validateField("confirmPassword", e.target.value);
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: errors }));
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
                Reset password
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        {/* Back to login */}
        <div className="text-center text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

