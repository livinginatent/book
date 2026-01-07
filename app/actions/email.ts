"use server";

import { Resend } from "resend";

import { ContactEmail, WelcomeEmail } from "@/components/email";

// Log environment configuration at module load
console.warn("[Email Module] Initializing...");
console.warn("[Email Module] RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
console.warn("[Email Module] RESEND_API_KEY length:", process.env.RESEND_API_KEY?.length || 0);
console.warn("[Email Module] RESEND_FROM_EMAIL:", process.env.RESEND_FROM_EMAIL || "(using default)");
console.warn("[Email Module] CONTACT_EMAIL:", process.env.CONTACT_EMAIL || "(using default)");

const resend = new Resend(process.env.RESEND_API_KEY);

// Get the verified domain from env, fallback to resend.dev for testing
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Booktab <onboarding@resend.dev>";

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  verificationUrl?: string;
}

interface ContactEmailParams {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail({
  to,
  firstName,
  verificationUrl,
}: WelcomeEmailParams): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Welcome to Booktab, ${firstName}! 📚`,
      react: WelcomeEmail({ firstName, verificationUrl }),
    });

    if (error) {
      console.error("[Email] Welcome email error:", error);
      return { success: false, error: error.message };
    }

    console.warn("[Email] Welcome email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Unexpected error sending welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a contact form submission email
 */
export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
}: ContactEmailParams): Promise<EmailResult> {
  console.warn("[Email] ========== sendContactFormEmail START ==========");
  console.warn("[Email] Input params:", { name, email, subject, messageLength: message?.length });
  
  try {
    const recipientEmail =
      process.env.CONTACT_EMAIL || "contact@iemiigio.resend.app";

    console.warn("[Email] Configuration:", {
      from: FROM_EMAIL,
      to: recipientEmail,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + "...",
    });

    console.warn("[Email] Rendering ContactEmail component...");
    const emailComponent = ContactEmail({ name, email, subject, message });
    console.warn("[Email] ContactEmail component rendered:", !!emailComponent);

    console.warn("[Email] Calling resend.emails.send()...");
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      react: emailComponent,
    });

    console.warn("[Email] Resend API response:", { data, error });

    if (error) {
      console.error("[Email] Contact email error:", error);
      console.error("[Email] Error details:", JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    console.warn("[Email] ========== SUCCESS - Email ID:", data?.id, "==========");
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] ========== EXCEPTION ==========");
    console.error("[Email] Unexpected error sending contact email:", error);
    if (error instanceof Error) {
      console.error("[Email] Error name:", error.name);
      console.error("[Email] Error message:", error.message);
      console.error("[Email] Error stack:", error.stack);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generic email sender for custom emails
 */
interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: React.ReactElement;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  react,
  replyTo,
}: SendEmailParams): Promise<EmailResult> {
  try {
    const recipients = Array.isArray(to) ? to : [to];

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipients,
      subject,
      html,
      text,
      react,
      replyTo,
    });

    if (error) {
      console.error("[Email] Send error:", error);
      return { success: false, error: error.message };
    }

    console.warn("[Email] Email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

