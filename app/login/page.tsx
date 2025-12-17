import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <Suspense fallback={<div className="w-full max-w-md h-96 bg-muted/50 rounded-xl animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
