
import { Footer } from "@/components/layout/footer";
import { CTASection } from "@/components/sections/cta-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { HeroSection } from "@/components/sections/hero-section";
import { ShowcaseSection } from "@/components/sections/showcase-section";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
     
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <ShowcaseSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
