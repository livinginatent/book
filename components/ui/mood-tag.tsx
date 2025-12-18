import { cn } from "@/lib/utils";

interface MoodTagProps {
  mood: string;
  color?: "coral" | "teal" | "purple" | "yellow";
  className?: string;
}

const colorMap = {
  coral: "bg-primary/10 text-primary",
  teal: "bg-accent/10 text-accent",
  purple: "bg-chart-3/20 text-chart-3",
  yellow: "bg-chart-4/20 text-chart-4",
};

export function MoodTag({ mood, color = "coral", className }: MoodTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
        colorMap[color],
        className
      )}
    >
      {mood}
    </span>
  );
}
