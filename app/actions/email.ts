"use server";

import { Resend } from "resend";

import { ContactEmail, WelcomeEmail } from "@/components/email";

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
  try {
    const recipientEmail =
      process.env.CONTACT_EMAIL || "contact@iemiigio.resend.app";

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      react: ContactEmail({ name, email, subject, message }),
    });

    if (error) {
      console.error("[Email] Contact email error:", error);
      return { success: false, error: error.message };
    }

    console.warn("[Email] Contact email sent:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Unexpected error sending contact email:", error);
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

