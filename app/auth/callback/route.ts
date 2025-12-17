import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";
  const error = requestUrl.searchParams.get("error");
  const error_description = requestUrl.searchParams.get("error_description");

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    const errorMessage = error_description || error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      // Handle specific errors
      if (exchangeError.message.includes("expired")) {
        return NextResponse.redirect(
          new URL("/login?error=Your verification link has expired. Please request a new one.", requestUrl.origin)
        );
      }
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }

    // Determine where to redirect based on the "next" parameter
    let redirectUrl = requestUrl.origin;
    
    if (next === "/reset-password") {
      // For password reset, redirect to reset password page
      redirectUrl = `${requestUrl.origin}/reset-password`;
    } else if (next === "/") {
      // For email verification, show success message then redirect to home
      redirectUrl = `${requestUrl.origin}/login?message=email-verified`;
    } else {
      redirectUrl = `${requestUrl.origin}${next}`;
    }

    return NextResponse.redirect(redirectUrl);
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL("/login", requestUrl.origin));
}

