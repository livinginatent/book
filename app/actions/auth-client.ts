"use client";

import { createClient } from "@/lib/supabase/client";

export async function signOutClient(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  // Use router.refresh() from the calling component instead of hard reload
}

/**
 * Client-side forgot password
 * The email template handles the redirect URL using token_hash
 */
export async function forgotPasswordClient(
  email: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = createClient();

  // Don't specify redirectTo - let the email template handle the URL
  // The email template should use: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    if (error.message.includes("rate limit")) {
      return { error: "Too many attempts. Please try again later" };
    }
    return { error: error.message };
  }

  return { success: true };
}
