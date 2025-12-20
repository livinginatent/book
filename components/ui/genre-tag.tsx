import { cn } from "@/lib/utils";

interface GenreTagProps {
  genre: string;
  className?: string;
}

const genreColors: Record<string, string> = {
  fiction: "bg-primary/10 text-primary",
  fantasy: "bg-chart-3/20 text-chart-3",
  romance: "bg-chart-5/20 text-chart-5",
  mystery: "bg-accent/10 text-accent",
  thriller: "bg-destructive/10 text-destructive",
  "sci-fi": "bg-chart-2/20 text-chart-2",
  "science fiction": "bg-chart-2/20 text-chart-2",
  horror: "bg-foreground/10 text-foreground",
  biography: "bg-chart-4/20 text-chart-4",
  history: "bg-chart-4/20 text-chart-4",
  "self-help": "bg-accent/10 text-accent",
  poetry: "bg-chart-3/20 text-chart-3",
  drama: "bg-primary/10 text-primary",
  adventure: "bg-chart-2/20 text-chart-2",
  classics: "bg-chart-4/20 text-chart-4",
  default: "bg-muted text-muted-foreground",
};

export function GenreTag({ genre, className }: GenreTagProps) {
  const normalizedGenre = genre.toLowerCase();
  const colorClass =
    Object.entries(genreColors).find(([key]) =>
      normalizedGenre.includes(key)
    )?.[1] || genreColors.default;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        colorClass,
        className
      )}
    >
      {genre}
    </span>
  );
}
