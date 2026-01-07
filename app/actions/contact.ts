"use server";

import { z } from "zod";

import { sendContactFormEmail } from "@/app/actions/email";

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
  console.warn("[Contact] ========== START ==========");
  console.warn("[Contact] Received data:", {
    name: data.name,
    email: data.email,
    subject: data.subject,
    messageLength: data.message?.length,
  });

  // Validate input
  const validatedFields = contactSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error(
      "[Contact] Validation failed:",
      validatedFields.error.flatten().fieldErrors
    );
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  console.warn("[Contact] Validation passed");

  const { name, email, subject, message } = validatedFields.data;

  // Use the reusable email action
  console.warn("[Contact] Calling sendContactFormEmail...");
  const result = await sendContactFormEmail({ name, email, subject, message });
  console.warn("[Contact] sendContactFormEmail result:", result);

  if (!result.success) {
    console.error("[Contact] Email sending failed:", result.error);
    return {
      error: result.error || "Failed to send email. Please try again later.",
    };
  }

  console.warn("[Contact] ========== SUCCESS ==========");
  return { success: true };
}
