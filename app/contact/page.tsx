import type { Metadata } from "next";

import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact Us - Booktab",
  description:
    "Get in touch with the Booktab team. We'd love to hear from you! Send us your questions, feedback, or suggestions.",
  keywords: [
    "contact booktab",
    "booktab support",
    "reading tracker support",
    "book tracking help",
  ],
  openGraph: {
    title: "Contact Us - Booktab",
    description:
      "Get in touch with the Booktab team. We'd love to hear from you!",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              Have a question or feedback? We'd love to hear from you. Send us
              a message and we'll respond as soon as possible.
            </p>
          </div>

          {/* Contact Form */}
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

