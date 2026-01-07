"use server";

import { Resend } from "resend";
import { z } from "zod";

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
    // Use Resend API to send email
    const resendApiKey = process.env.RESEND_API_KEY;
    // Send to Resend receiving domain - webhook will forward to actual email
    // Use your Resend receiving domain: <anything>@iemiigio.resend.app
    const recipientEmail =
      process.env.CONTACT_RECEIVING_EMAIL || "contact@iemiigio.resend.app";

    // Debug logging
    console.warn("[Contact Form] Attempting to send email...");
    console.warn("[Contact Form] API Key present:", !!resendApiKey);
    console.warn("[Contact Form] Recipient:", recipientEmail);

    if (!resendApiKey) {
      console.error("[Contact Form] RESEND_API_KEY is not configured");
      return {
        error: "Email service is not configured. Please try again later.",
      };
    }

    const resend = new Resend(resendApiKey);

    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const map: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    const { data: emailData, error: resendError } = await resend.emails.send({
      from: "Booktab Contact <onboarding@resend.dev>",
      to: [recipientEmail],
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .field {
                margin-bottom: 20px;
              }
              .label {
                font-weight: 600;
                color: #667eea;
                margin-bottom: 5px;
                display: block;
              }
              .value {
                background: white;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #667eea;
              }
              .message-box {
                background: white;
                padding: 15px;
                border-radius: 6px;
                border-left: 3px solid #667eea;
                white-space: pre-wrap;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>New Contact Form Submission</h1>
              <p>You have received a new message from the Booktab contact form</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="label">Name:</span>
                <div class="value">${safeName}</div>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <div class="value">${safeEmail}</div>
              </div>
              <div class="field">
                <span class="label">Subject:</span>
                <div class="value">${safeSubject}</div>
              </div>
              <div class="field">
                <span class="label">Message:</span>
                <div class="message-box">${safeMessage}</div>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `.trim(),
    });

    if (resendError) {
      console.error("[Contact Form] Resend API error:", resendError);
      console.error(
        "[Contact Form] Error details:",
        JSON.stringify(resendError, null, 2)
      );
      return {
        error: `Failed to send email: ${
          resendError.message || "Unknown error"
        }. Please try again later.`,
      };
    }

    if (emailData) {
      console.warn("[Contact Form] Email sent successfully:", emailData.id);
    } else {
      console.warn(
        "[Contact Form] No error but also no data returned from Resend"
      );
    }

    return { success: true };
  } catch (error) {
    console.error("[Contact Form] Unexpected error:", error);
    if (error instanceof Error) {
      console.error("[Contact Form] Error message:", error.message);
      console.error("[Contact Form] Error stack:", error.stack);
    }
    return {
      error: `An unexpected error occurred: ${
        error instanceof Error ? error.message : "Unknown error"
      }. Please try again later.`,
    };
  }
}
