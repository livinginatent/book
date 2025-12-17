"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export async function signUp(data: RegisterInput): Promise<AuthResult> {
  // Validate input
  const validatedFields = registerSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
      }/auth/callback`,
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

  const { email, password } = validatedFields.data;

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Handle specific Supabase errors
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password" };
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/auth/callback?next=/reset-password`,
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
