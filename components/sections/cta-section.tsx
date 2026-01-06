import { BookOpenText, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

export function CTASection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-10 md:p-16 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-primary-foreground/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-primary-foreground/10 rounded-full translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-6">
              <BookOpenText className="w-8 h-8 text-primary-foreground" />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-4 text-balance">
              Ready to fall in love with reading again?
            </h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto text-pretty">
              Join 50,000+ readers who track their books with Booktab. Free
              forever, no credit card required.
            </p>

            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-lg bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
            >
              Create your free account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
