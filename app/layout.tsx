import type { Metadata } from "next";
import { Nunito, Merriweather } from "next/font/google";
import { cookies } from "next/headers";
import type React from "react";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";
import type { Profile } from "@/types/database.types";

// Initialize fonts
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Booktab - Track Your Reading Journey",
  description:
    "A joyful way to track your books, discover new reads, and celebrate your reading journey.",
};

// Server-side auth data type
interface ServerAuthData {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
}

// Get initial auth data server-side
async function getServerAuth(): Promise<ServerAuthData> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null };
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      user: { id: user.id, email: user.email },
      profile: profile ?? null,
    };
  } catch (error) {
    console.error("Error fetching server auth:", error);
    return { user: null, profile: null };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch initial auth server-side
  const serverAuth = await getServerAuth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${merriweather.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider initialAuth={serverAuth}>
            <Navbar initialAuth={serverAuth} />
            {children}
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
