import * as React from "react";

interface ContactEmailProps {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export function ContactEmail({ name, email, subject, message }: ContactEmailProps) {
  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: "1.6",
        color: "#333",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "30px",
          borderRadius: "12px 12px 0 0",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: "700" }}>
          New Contact Form Submission
        </h1>
        <p style={{ margin: "0", opacity: 0.9, fontSize: "14px" }}>
          You have received a new message from the Booktab contact form
        </p>
      </div>

      <div
        style={{
          background: "#f9fafb",
          padding: "30px",
          borderRadius: "0 0 12px 12px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <span
            style={{
              fontWeight: "600",
              color: "#667eea",
              marginBottom: "5px",
              display: "block",
              fontSize: "14px",
            }}
          >
            Name:
          </span>
          <div
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: "3px solid #667eea",
            }}
          >
            {name}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <span
            style={{
              fontWeight: "600",
              color: "#667eea",
              marginBottom: "5px",
              display: "block",
              fontSize: "14px",
            }}
          >
            Email:
          </span>
          <div
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: "3px solid #667eea",
            }}
          >
            <a href={`mailto:${email}`} style={{ color: "#667eea" }}>
              {email}
            </a>
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <span
            style={{
              fontWeight: "600",
              color: "#667eea",
              marginBottom: "5px",
              display: "block",
              fontSize: "14px",
            }}
          >
            Subject:
          </span>
          <div
            style={{
              background: "white",
              padding: "12px",
              borderRadius: "6px",
              borderLeft: "3px solid #667eea",
            }}
          >
            {subject}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <span
            style={{
              fontWeight: "600",
              color: "#667eea",
              marginBottom: "5px",
              display: "block",
              fontSize: "14px",
            }}
          >
            Message:
          </span>
          <div
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "6px",
              borderLeft: "3px solid #667eea",
              whiteSpace: "pre-wrap" as const,
            }}
          >
            {message}
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center" as const,
          padding: "20px",
          color: "#999",
          fontSize: "12px",
        }}
      >
        <p style={{ margin: "0" }}>
          This email was sent from the Booktab contact form.
        </p>
      </div>
    </div>
  );
}

