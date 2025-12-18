"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

type AuthResult = {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
};

// Check if email or username already exists
export async function checkExists(
  field: "email" | "username",
  value: string
): Promise<{ exists: boolean }> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq(field, value.toLowerCase())
    .single();

  return { exists: !!data };
}

export async function signUp(data: RegisterInput): Promise<AuthResult> {
  // Validate input
  const validatedFields = registerSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, username, password } = validatedFields.data;

  // Check if email already exists
  const { exists: emailExists } = await checkExists("email", email);
  if (emailExists) {
    return { error: "An account with this email already exists" };
  }

  // Check if username already exists
  const { exists: usernameExists } = await checkExists("username", username);
  if (usernameExists) {
    return { error: "This username is already taken" };
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  /*   const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
   */
  // emailRedirectTo becomes {{ .RedirectTo }} in the email template
  // Template should use: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "/login?message=email-verified",
      data: {
        username: username.toLowerCase(),
      },
    },
  });

  if (error) {
    // Handle specific Supabase errors
    if (error.message.includes("already registered")) {
      return { error: "An account with this email already exists" };
    }
    if (error.message.includes("rate limit")) {
      return { error: "Too many attempts. Please try again later" };
    }
    return { error: error.message };
  }

  // Check if user already exists (Supabase returns user with empty identities for existing emails)
  // This happens when "Confirm email" is enabled and the email is already registered
  if (signUpData?.user?.identities?.length === 0) {
    return { error: "An account with this email already exists" };
  }

  // Also check if user exists but email is not confirmed (no session returned)
  if (
    signUpData?.user &&
    !signUpData.session &&
    signUpData.user.identities &&
    signUpData.user.identities.length > 0
  ) {
    // This is a legitimate new signup waiting for email confirmation
    return { success: true };
  }

  // If we got a user back, it's successful
  if (signUpData?.user) {
    return { success: true };
  }

  // Fallback error
  return { error: "Something went wrong. Please try again." };
}

export async function signIn(
  data: LoginInput,
  redirectTo?: string
): Promise<AuthResult> {
  // Validate input
  const validatedFields = loginSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { identifier, password } = validatedFields.data;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Determine if identifier is email or username
  const isEmail = identifier.includes("@");
  let email = identifier;

  if (!isEmail) {
    // Look up email by username
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("username", identifier.toLowerCase())
      .single();

    if (!profile?.email) {
      return { error: "Invalid username or password" };
    }
    email = profile.email;
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Handle specific Supabase errors
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email/username or password" };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please verify your email before signing in" };
    }
    if (error.message.includes("rate limit")) {
      return { error: "Too many attempts. Please try again later" };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");

  // Redirect to the specified URL or home
  const safeRedirect = redirectTo?.startsWith("/") ? redirectTo : "/";
  redirect(safeRedirect);
}

export async function signOut(): Promise<void> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/");
}

export async function forgotPassword(
  data: ForgotPasswordInput
): Promise<AuthResult> {
  // Validate input
  const validatedFields = forgotPasswordSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email } = validatedFields.data;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // For PKCE flow, redirectTo becomes {{ .RedirectTo }} in the email template
  // Route through /auth/callback to exchange the code, then redirect to /reset-password
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    if (error.message.includes("rate limit")) {
      return { error: "Too many attempts. Please try again later" };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(
  data: ResetPasswordInput
): Promise<AuthResult> {
  // Validate input
  const validatedFields = resetPasswordSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { password } = validatedFields.data;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    if (error.message.includes("same password")) {
      return {
        error: "New password must be different from your current password",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login?message=password-updated");
}
