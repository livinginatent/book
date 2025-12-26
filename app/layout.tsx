import type { Metadata } from "next";
import { Nunito, Merriweather } from "next/font/google";
import type React from "react";

import { Navbar } from "@/components/layout/navbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";
import { Footer } from "@/components/layout/footer";

// Initialize fonts from your first code block
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
  title: "Bookly - Track Your Reading Journey",
  description:
    "A joyful way to track your books, discover new reads, and celebrate your reading journey.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <AuthProvider>
            <Navbar />
            {children}
            <Footer/>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
