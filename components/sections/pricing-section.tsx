import { SectionHeading } from "@/components/ui/section-heading";

import { PricingCard } from "../ui/pricing-card";

const plans = [
  {
    name: "Bookworm",
    price: "Free",
    description: "Perfect for casual readers who want to track their journey",
    features: [
      "Track unlimited books",
      "Set yearly reading goals",
      "Basic reading stats",
      "Catalog books based on mood",
      "Rate and review books",
      "Migration tool - import your books from other sites"
    ],
    buttonText: "Start Reading Free",
    href: "/register",
    popular: false,
  },
  {
    name: "Bibliophile",
    price: "$4.99",
    period: "month",
    description: "For passionate readers who want the full experience",
    features: [
      "Everything in Bookworm",
      "Advanced reading insights",
      "Mood & pace tracking",
      "Unlimited private shelves",
      "Priority book recommendations",
      "Export your data anytime",
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
