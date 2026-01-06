import { SectionHeading } from "@/components/ui/section-heading";

import { PricingCard } from "../ui/pricing-card";

const plans = [
  {
    name: "Bookworm",
    price: "Free",
    description: "For readers who just want to track their journey",
    features: [
      "Track unlimited books",
      "Set up to 6 simple reading goals",
      "Basic reading stats",
      "Find books you might like",
      "Create custom shelves (up to 4)",
      "Rate and review books & log journal entries",
      "Migrate your books from other sites",
      "Export your data anytime"
    ],
    buttonText: "Start Reading Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Bibliophile",
    price: "$3.99",
    period: "month",
    description: "Perfect for readers who want the full experience",
    features: [
      "Everything in Bookworm",
      "Set up to 14 advanced reading goals",
      "Advanced reading insights",
      "Smart book recommendations based on your reading history",
      "Mood & pace tracking",
      "Unlimited private shelves",
      "Early access to new features",
    ],
    buttonText: "Upgrade to Bibliophile",
    href: "/register?plan=bibliophile",
    popular: true,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 bg-secondary/30">
      <div className="max-w-5xl mx-auto">
        <SectionHeading
          title="Choose Your Reading Adventure"
          subtitle="Start free, upgrade when you're ready. No pressure, just pages."
        />

        <div className="mt-16 grid md:grid-cols-2 gap-8 items-start max-w-3xl mx-auto">
          {plans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-8 text-sm">
          Cancel anytime. We believe in happy readers, not locked-in ones.
        </p>
      </div>
    </section>
  );
}
