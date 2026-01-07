import * as React from "react";

interface WelcomeEmailProps {
  firstName: string;
  verificationUrl?: string;
}

export function WelcomeEmail({ firstName, verificationUrl }: WelcomeEmailProps) {
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
          padding: "40px 30px",
          borderRadius: "12px 12px 0 0",
          textAlign: "center" as const,
        }}
      >
        <h1 style={{ margin: "0 0 10px", fontSize: "28px", fontWeight: "700" }}>
          Welcome to Booktab! 📚
        </h1>
        <p style={{ margin: "0", opacity: 0.9, fontSize: "16px" }}>
          Your reading journey starts here
        </p>
      </div>

      <div
        style={{
          background: "#f9fafb",
          padding: "30px",
          borderRadius: "0 0 12px 12px",
        }}
      >
        <p style={{ fontSize: "16px", marginBottom: "20px" }}>
          Hi <strong>{firstName}</strong>,
        </p>

        <p style={{ fontSize: "16px", marginBottom: "20px" }}>
          We&apos;re thrilled to have you join our community of book lovers!
          Booktab is here to help you track your reading, discover new books,
          and achieve your reading goals.
        </p>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
            borderLeft: "4px solid #667eea",
          }}
        >
          <h3 style={{ margin: "0 0 15px", color: "#667eea" }}>
            Here&apos;s what you can do:
          </h3>
          <ul style={{ margin: "0", paddingLeft: "20px" }}>
            <li style={{ marginBottom: "8px" }}>
              📖 Track your currently reading books
            </li>
            <li style={{ marginBottom: "8px" }}>
              🎯 Set and achieve reading goals
            </li>
            <li style={{ marginBottom: "8px" }}>
              📊 View detailed reading analytics
            </li>
            <li style={{ marginBottom: "8px" }}>
              📚 Organize your bookshelves
            </li>
            <li>✍️ Write reviews and journal entries</li>
          </ul>
        </div>

        {verificationUrl && (
          <div style={{ textAlign: "center" as const, marginBottom: "20px" }}>
            <a
              href={verificationUrl}
              style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                padding: "14px 32px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              Verify Your Email
            </a>
          </div>
        )}

        <p style={{ fontSize: "14px", color: "#666", marginTop: "30px" }}>
          Happy reading! 📖
          <br />
          <strong>The Booktab Team</strong>
        </p>
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
          © {new Date().getFullYear()} Booktab. All rights reserved.
        </p>
      </div>
    </div>
  );
}

