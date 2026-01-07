/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Mail, MessageSquare, Send, User } from "lucide-react";
import { useState } from "react";

import { sendContactEmail } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[]>
  >({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});
    setLoading(true);

    try {
      const result = await sendContactEmail({
        name,
        email,
        subject,
        message,
      });

      if (result.error) {
        setError(result.error);
        if (result.errors) {
          setFieldErrors(result.errors);
        }
      } else {
        setSuccess(true);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }
    } catch (err:any) {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <FormMessage type="error" message={error} />}
      {success && (
        <FormMessage
          type="success"
          message="Thank you for your message! We'll get back to you soon."
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name?.[0]}
            icon={<User className="w-4 h-4" />}
            required
            disabled={loading}
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email?.[0]}
            icon={<Mail className="w-4 h-4" />}
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Subject */}
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Subject
        </label>
        <Input
          id="subject"
          type="text"
          placeholder="What's this about?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          error={fieldErrors.subject?.[0]}
          icon={<MessageSquare className="w-4 h-4" />}
          required
          disabled={loading}
        />
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor="message"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Message
        </label>
        <Textarea
          id="message"
          placeholder="Tell us what's on your mind..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          required
          disabled={loading}
          className={
            fieldErrors.message?.[0]
              ? "border-destructive/50 focus:border-destructive focus:ring-destructive/20"
              : ""
          }
        />
        {fieldErrors.message?.[0] && (
          <p className="mt-1 text-sm text-destructive">
            {fieldErrors.message[0]}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Send className="w-4 h-4 mr-2 animate-pulse" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Send Message
          </>
        )}
      </Button>
    </form>
  );
}

