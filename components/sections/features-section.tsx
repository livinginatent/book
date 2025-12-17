import {
  BookMarked,
  Target,
  BarChart3,
  Sparkles,
  Bell,
  GlobeLock,
} from "lucide-react";

import { FeatureCard } from "@/components/ui/feature-card";
import { SectionHeading } from "@/components/ui/section-heading";

const features = [
  {
    icon: BookMarked,
    title: "Beautiful Library",
    description:
      "Organize your books in a visual library that's a joy to browse. See covers, not spreadsheets.",
  },
  {
    icon: Target,
    title: "Reading Goals",
    description:
      "Set yearly goals and watch your progress with satisfying animations and celebrations.",
  },
  {
    icon: BarChart3,
    title: "Fun Statistics",
    description:
      "Discover your reading patterns with playful charts. Pages read, genres explored, and more.",
  },
  {
    icon: GlobeLock,
    title: "Privacy & Data Portability",
    description:
      "We believe your reading history is personal. Enjoy a platform with zero third-party tracking and no ads.",
  },
  {
    icon: Sparkles,
    title: "Personalized Picks",
    description:
      "Get book recommendations based on your taste, not algorithms. We understand readers.",
  },
  {
    icon: Bell,
    title: "Gentle Nudges",
    description:
      "Friendly reminders to keep reading. We'll cheer you on, not nag you.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-2 bg-secondary/30">
      <div className="container mx-auto px-4">
        <SectionHeading
          title="Everything you need to love reading again"
          subtitle="We built Bookly to make tracking your reading journey feel less like homework and more like a hobby."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
