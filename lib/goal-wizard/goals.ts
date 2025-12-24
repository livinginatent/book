import { ReadingGoal } from "@/types/user.type";

export function calculatePace(goal: ReadingGoal): {
  expected: number;
  difference: number;
  status: "ahead" | "on_track" | "behind";
  pagesPerDay?: number;
} {
  const now = new Date();
  const startOfYear = new Date(goal.year, 0, 1);
  const endOfYear = new Date(goal.year, 11, 31);

  const totalDays = Math.ceil(
    (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysPassed = Math.ceil(
    (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = totalDays - daysPassed;

  const progressRatio = daysPassed / totalDays;
  const expected = Math.floor(goal.target * progressRatio);
  const difference = goal.current - expected;

  let status: "ahead" | "on_track" | "behind";
  if (difference > 0) {
    status = "ahead";
  } else if (difference < 0) {
    status = "behind";
  } else {
    status = "on_track";
  }

  // Calculate pages per day needed to catch up (for books, assume avg 300 pages)
  let pagesPerDay: number | undefined;
  if (status === "behind" && daysRemaining > 0) {
    const booksRemaining = goal.target - goal.current;
    const pagesRemaining =
      goal.type === "pages" ? goal.target - goal.current : booksRemaining * 300;
    pagesPerDay = Math.ceil(pagesRemaining / daysRemaining);
  }

  return { expected, difference, status, pagesPerDay };
}

export function getProgressPercentage(goal: ReadingGoal): number {
  return Math.min((goal.current / goal.target) * 100, 100);
}

export function getPacePercentage(goal: ReadingGoal): number {
  const { expected } = calculatePace(goal);
  return Math.min((expected / goal.target) * 100, 100);
}

export function isGoalCompleted(goal: ReadingGoal): boolean {
  return goal.current >= goal.target;
}

export function formatGoalProgress(goal: ReadingGoal): string {
  const unit = goal.type === "pages" ? "Pages" : "Books";
  return `${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} ${unit}`;
}

export function estimateReadingTime(
  pages: number,
  pagesPerHour: number
): string {
  const hours = Math.round(pages / pagesPerHour);
  if (hours < 1) return "less than an hour";
  if (hours === 1) return "~1 hour";
  return `~${hours} hours`;
}

export const AVAILABLE_GENRES = [
  "Fiction",
  "Non-Fiction",
  "Mystery",
  "Sci-Fi",
  "Fantasy",
  "Romance",
  "Thriller",
  "Biography",
  "Self-Help",
  "History",
  "Poetry",
  "Horror",
] as const;
