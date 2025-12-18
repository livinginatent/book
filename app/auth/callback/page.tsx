"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * Fallback callback page for older auth flows
 * The main auth flow now uses /auth/confirm with token_hash
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();

      // Check for hash-based tokens (implicit flow fallback)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        setStatus("Setting up session...");
        
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || "";
        const type = hashParams.get("type");

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error) {
            if (type === "recovery") {
              router.replace("/reset-password");
            } else {
              router.replace("/");
            }
            return;
          }
        }
      }

      // Check for code (PKCE flow fallback)
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        router.replace("/auth/auth-code-error");
        return;
      }

      if (code) {
        setStatus("Exchanging code...");
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!exchangeError && data?.user) {
          if (data.user.recovery_sent_at) {
            router.replace("/reset-password");
          } else {
            router.replace("/login?message=email-verified");
          }
          return;
        }
      }

      // Check if already logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.recovery_sent_at) {
          router.replace("/reset-password");
        } else {
          router.replace("/");
        }
        return;
      }

      // Nothing worked, show error
      router.replace("/auth/auth-code-error");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
