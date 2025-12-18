import { Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface BookRecommendationsProps {
  isPriority?: boolean;
  locked?: boolean;
}

export function BookRecommendations({
  isPriority = false,
  locked = false,
}: BookRecommendationsProps) {
  const recommendations = [
    { title: "The Midnight Library", author: "Matt Haig", match: 94 },
    { title: "Project Hail Mary", author: "Andy Weir", match: 91 },
    { title: "Klara and the Sun", author: "Kazuo Ishiguro", match: 88 },
  ];

  return (
    <DashboardCard
      title={isPriority ? "Priority Recommendations" : "Book Recommendations"}
      description={
        isPriority
          ? "Curated picks just for you"
          : "Based on your reading history"
      }
      icon={Sparkles}
      locked={locked}
    >
      <div className="space-y-3">
        {recommendations.map((book, index) => (
          <div
            key={book.title}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-14 rounded-lg  flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {index + 1}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{book.title}</p>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-3 h-3 fill-current" />
              <span className="text-xs font-medium">{book.match}%</span>
            </div>
          </div>
        ))}
        <Button
          variant="ghost"
          className="w-full rounded-xl text-muted-foreground"
        >
          View All Recommendations
        </Button>
      </div>
    </DashboardCard>
  );
}
