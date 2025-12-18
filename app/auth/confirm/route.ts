import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Successfully verified - redirect to the next page
      // Handle both relative paths and full URLs
      const isFullUrl =
        next.startsWith("http://") || next.startsWith("https://");

      if (isFullUrl) {
        // If it's a full URL, extract just the path and search params
        try {
          const nextUrl = new URL(next);
          const redirectTo = request.nextUrl.clone();
          redirectTo.pathname = nextUrl.pathname;
          redirectTo.search = nextUrl.search;
          return NextResponse.redirect(redirectTo);
        } catch {
          // If URL parsing fails, fall back to root
          return NextResponse.redirect(new URL("/", request.url));
        }
      } else {
        // If it's a relative path, use it directly
        const redirectTo = new URL(next, request.url);
        return NextResponse.redirect(redirectTo);
      }
    }

    console.error("[Auth Confirm] OTP verification error:", error.message);
  }

  // Redirect to error page with instructions
  const errorRedirect = new URL("/auth/auth-code-error", request.url);
  return NextResponse.redirect(errorRedirect);
}
