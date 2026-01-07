"use server";

import { Resend } from "resend";
import { z } from "zod";

import { ContactEmail } from "@/components/email";

const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(200, "Subject must be less than 200 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be less than 5000 characters"),
});

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactResult {
  success?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
}

export async function sendContactEmail(
  data: ContactFormData
): Promise<ContactResult> {
  // Validate input
  const validatedFields = contactSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, subject, message } = validatedFields.data;

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail =
      process.env.CONTACT_RECEIVING_EMAIL || "contact@iemiigio.resend.app";
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "Booktab <onboarding@resend.dev>";

    if (!resendApiKey) {
      console.error("[Contact Form] RESEND_API_KEY is not configured");
      return {
        error: "Email service is not configured. Please try again later.",
      };
    }

    const resend = new Resend(resendApiKey);

    const { data: emailData, error: resendError } = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      react: ContactEmail({ name, email, subject, message }),
    });

    if (resendError) {
      console.error("[Contact Form] Resend API error:", resendError);
      return {
        error: `Failed to send email: ${
          resendError.message || "Unknown error"
        }. Please try again later.`,
      };
    }

    if (emailData) {
      console.warn("[Contact Form] Email sent successfully:", emailData.id);
    }

    return { success: true };
  } catch (error) {
    console.error("[Contact Form] Unexpected error:", error);
    return {
      error: `An unexpected error occurred: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Please try again later.`,
    };
  }
}
