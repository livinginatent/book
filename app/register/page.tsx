import { Suspense } from "react";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <Suspense
        fallback={
          <div className="w-full max-w-md h-[720px] bg-muted/50 rounded-xl animate-pulse" />
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
