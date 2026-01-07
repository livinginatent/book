import { NextRequest } from "next/server";
import { Resend } from "resend";

import { ContactEmail, WelcomeEmail } from "@/components/email";

const resend = new Resend(process.env.RESEND_API_KEY);

// Get the verified domain from env, fallback to resend.dev for testing
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Booktab <onboarding@resend.dev>";

interface SendEmailRequest {
  type: "welcome" | "contact";
  to: string | string[];
  data: WelcomeEmailData | ContactEmailData;
}

interface WelcomeEmailData {
  firstName: string;
  verificationUrl?: string;
}

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { type, to, data } = body;

    // Validate required fields
    if (!type || !to || !data) {
      return Response.json(
        { error: "Missing required fields: type, to, data" },
        { status: 400 }
      );
    }

    const recipients = Array.isArray(to) ? to : [to];

    let emailResponse;

    switch (type) {
      case "welcome": {
        const welcomeData = data as WelcomeEmailData;
        emailResponse = await resend.emails.send({
          from: FROM_EMAIL,
          to: recipients,
          subject: `Welcome to Booktab, ${welcomeData.firstName}! 📚`,
          react: WelcomeEmail({
            firstName: welcomeData.firstName,
            verificationUrl: welcomeData.verificationUrl,
          }),
        });
        break;
      }

      case "contact": {
        const contactData = data as ContactEmailData;
        const recipientEmail =
          process.env.CONTACT_EMAIL || "contact@iemiigio.resend.app";

        emailResponse = await resend.emails.send({
          from: FROM_EMAIL,
          to: [recipientEmail],
          replyTo: contactData.email,
          subject: `Contact Form: ${contactData.subject}`,
          react: ContactEmail({
            name: contactData.name,
            email: contactData.email,
            subject: contactData.subject,
            message: contactData.message,
          }),
        });
        break;
      }

      default:
        return Response.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    if (emailResponse.error) {
      console.error("[Email API] Error sending email:", emailResponse.error);
      return Response.json({ error: emailResponse.error }, { status: 500 });
    }

    return Response.json({ data: emailResponse.data });
  } catch (error) {
    console.error("[Email API] Unexpected error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

