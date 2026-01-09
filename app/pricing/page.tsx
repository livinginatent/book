import { Check, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing - Booktab | Simple & Transparent Pricing",
  description:
    "Start tracking your reading journey for free. Upgrade to Bibliophile for advanced features. No hidden fees, cancel anytime.",
  keywords: [
    "booktab pricing",
    "reading tracker pricing",
    "book tracking subscription",
    "free reading tracker",
    "premium reading tracker",
  ],
  openGraph: {
    title: "Pricing - Booktab | Simple & Transparent Pricing",
    description:
      "Start tracking your reading journey for free. Upgrade to Bibliophile for advanced features.",
    type: "website",
  },
};

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
      "Export your data anytime",
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

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Simple, <span className="text-primary">transparent pricing</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty">
              Start free, upgrade when you're ready. No hidden fees, no
              pressure. Cancel anytime and keep your data.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col p-8 rounded-3xl bg-card border-2 transition-all ${
                  plan.popular
                    ? "border-primary shadow-xl shadow-primary/10 scale-105"
                    : "border-border hover:border-primary/30 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      <Zap className="w-4 h-4" />
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.popular
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }`}
                      >
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={`w-full h-12 rounded-xl font-semibold ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                  }`}
                >
                  <Link href={plan.href}>{plan.buttonText}</Link>
                </Button>
              </div>
            ))}
          </div>

          <p className="text-center text-muted-foreground mt-12 text-sm">
            Cancel anytime. We believe in happy readers, not locked-in ones.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Can I try Bibliophile before committing?
                </h3>
                <p className="text-muted-foreground">
                  Yes! Start with the free Bookworm plan and upgrade anytime. We
                  want you to love Booktab before you spend a dime.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  What happens if I cancel my subscription?
                </h3>
                <p className="text-muted-foreground">
                  You'll keep access to Bibliophile features until the end of
                  your billing period, then automatically move to the free
                  Bookworm plan. All your data stays safe and you can always
                  re-subscribe.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Can I export my data?
                </h3>
                <p className="text-muted-foreground">
                  Absolutely! Both plans let you export your reading data anytime.
                  Your books, your data, your control.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Do you offer refunds?
                </h3>
                <p className="text-muted-foreground">
                  Yes! If you're not happy with Bibliophile within the first 7
                  days, we'll give you a full refund, no questions asked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Ready to start your reading journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of readers who track their books with joy, not
              stress.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href="/register">Start Free Today</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-8"
              >
                <Link href="/features">Explore Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

