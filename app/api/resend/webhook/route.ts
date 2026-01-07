import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Webhook endpoint for receiving emails via Resend
export async function POST(request: NextRequest) {
  try {
    const event = await request.json();

    // Only process email.received events
    if (event.type !== "email.received") {
      return NextResponse.json({ received: true });
    }

    const emailData = event.data;

    // Log the received email (for debugging)
    console.warn("[Resend Webhook] Email received:", {
      emailId: emailData.email_id,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
    });

    // Get the email content using Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail =
      process.env.CONTACT_EMAIL || "suleyman.eminbeyli@gmail.com";

    if (!resendApiKey) {
      console.error("[Resend Webhook] RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    // Fetch the full email content using the Received Emails API
    try {
      // Use the Resend API to get the received email content
      const response = await fetch(
        `https://api.resend.com/emails/${emailData.email_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[Resend Webhook] Error fetching email content:",
          response.status,
          errorText
        );
        // Still return success to avoid webhook retries
        return NextResponse.json({ received: true });
      }

      const emailContent = await response.json();

      // Extract email body (could be in html or text field)
      const emailBody =
        emailContent.html || emailContent.text || "No content available";

      // Forward the email to your actual email address
      await resend.emails.send({
        from: "Booktab Contact <onboarding@resend.dev>",
        to: [recipientEmail],
        replyTo: emailData.from,
        subject: `[Contact Form] ${emailData.subject || "No Subject"}`,
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
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>New Contact Form Submission</h1>
                <p>You have received a new message via the contact form</p>
              </div>
              <div class="content">
                <div class="field">
                  <span class="label">From:</span>
                  <div class="value">${emailData.from}</div>
                </div>
                <div class="field">
                  <span class="label">To:</span>
                  <div class="value">${emailData.to.join(", ")}</div>
                </div>
                <div class="field">
                  <span class="label">Subject:</span>
                  <div class="value">${emailData.subject || "No Subject"}</div>
                </div>
                <div class="field">
                  <span class="label">Message:</span>
                  <div class="message-box">${emailBody}</div>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
New Contact Form Submission

From: ${emailData.from}
To: ${emailData.to.join(", ")}
Subject: ${emailData.subject || "No Subject"}

Message:
${emailContent.text || emailBody}
        `.trim(),
      });

      console.warn("[Resend Webhook] Email forwarded successfully");
    } catch (error) {
      console.error("[Resend Webhook] Error fetching/forwarding email:", error);
      // Still return success to Resend to avoid retries
      // You can implement retry logic separately if needed
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Resend Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
