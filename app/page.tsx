"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AuthenticatedHome } from "@/components/home/authenticated-home";
import { Footer } from "@/components/layout/footer";
import { CTASection } from "@/components/sections/cta-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { PricingSection } from "@/components/sections/pricing-section";
import { useAuth } from "@/hooks/use-auth";

function HomePageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle auth callback codes/errors that land on root URL
  // This happens when Supabase redirects to Site URL instead of callback URL
  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    // Don't process if no params
    if (!code && !error) return;
    
    if (error) {
      const errorMsg = errorDescription || error;
      
      // PKCE flow errors - redirect to forgot password
      if (errorMsg.toLowerCase().includes("flow")) {
        router.replace("/forgot-password?error=Your reset link expired. Please request a new one.");
      } else {
        router.replace(`/login?error=${encodeURIComponent(errorMsg)}`);
      }
      return;
    }
    
    if (code) {
      // Forward to auth callback
      router.replace(`/auth/callback?code=${code}`);
    }
  }, [searchParams, router]);

  // Show loading state with a nice skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  // Show authenticated homepage if user is logged in
  if (user) {
    return <AuthenticatedHome />;
  }

  // Show public homepage for non-authenticated users
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingSection/>
        <HowItWorksSection/>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
