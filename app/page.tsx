import { cookies } from "next/headers";
import { Suspense } from "react";

import { getDashboardData } from "@/app/actions/dashboard-data";
import { AuthenticatedHome } from "@/components/home/authenticated-home";
import { CTASection } from "@/components/sections/cta-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorksSection } from "@/components/sections/how-it-works";
import { PricingSection } from "@/components/sections/pricing-section";
import { createClient } from "@/lib/supabase/server";

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

// Public homepage for non-authenticated users
function PublicHomepage() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <HowItWorksSection />
        <CTASection />
      </main>
   
    </div>
  );
}

// Server component that fetches data
async function HomePageServer() {
  // Quick auth check first (server-side, no network latency like client)
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, show public page immediately
  if (!user) {
    return <PublicHomepage />;
  }

  // Fetch all dashboard data in one go (server-side)
  const dashboardData = await getDashboardData();

  if (!dashboardData.success) {
    // Fallback to public page if data fetch fails
    console.error("Dashboard data fetch failed:", dashboardData.error);
    return <PublicHomepage />;
  }

  // Log timing in development
  if (process.env.NODE_ENV === "development") {
    console.log("[PERF] Dashboard data timing:", dashboardData.timing);
  }

  // Pass pre-fetched data to client component
  return <AuthenticatedHome initialData={dashboardData} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HomePageServer />
    </Suspense>
  );
}
