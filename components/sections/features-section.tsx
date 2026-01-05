import type { LucideIcon } from "lucide-react";
import { UserCheck, GlobeLock, MonitorDot } from "lucide-react";
import type { IconType } from "react-icons";
import { IoStatsChart } from "react-icons/io5";
import { PiTarget } from "react-icons/pi";
import { RiBook2Fill } from "react-icons/ri";

import { FeatureCard } from "@/components/ui/feature-card";
import { SectionHeading } from "@/components/ui/section-heading";

interface Feature {
  icon: LucideIcon | IconType;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: RiBook2Fill,
    title: "Beautiful Library",
    description:
      "Organize your books in a visual library that's a joy to browse. See covers, not spreadsheets.",
  },
  {
    icon: PiTarget,
    title: "Reading Goals",
    description:
      "Set yearly goals and watch your progress with satisfying animations and celebrations.",
  },
  {
    icon: IoStatsChart,
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
    icon: UserCheck,
    title: "Personalized Picks",
    description:
      "Get book recommendations based on your taste. We understand readers.",
  },
  {
    icon: MonitorDot,
    title: "Modern UI",
    description:
      "Our sleek, intuitive design makes tracking your reading effortless and enjoyable.",
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
