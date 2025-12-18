import { Suspense } from "react";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

function LoadingFallback() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="animate-pulse space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted" />
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-64 rounded bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <Suspense fallback={<LoadingFallback />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
