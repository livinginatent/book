import { ReadingGoal } from "@/types/user.type";

export function calculatePace(goal: ReadingGoal): {
  expected: number;
  difference: number;
  status: "ahead" | "on_track" | "behind";
  catchUpRate?: number;
} {
  const now = new Date();
  
  // Determine start and end dates based on goal type and period
  let periodStart: Date;
  let periodEnd: Date;
  
  if (goal.type === "books" && goal.startDate && goal.endDate) {
    // Use custom period for books goals
    periodStart = new Date(goal.startDate);
    periodEnd = new Date(goal.endDate);
  } else if (goal.type === "books" && goal.periodMonths) {
    // Use preset period (calculate from goal creation date or use current date as start)
    // For simplicity, we'll use current date as start if not specified
    periodStart = goal.startDate ? new Date(goal.startDate) : new Date();
    periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + goal.periodMonths);
  } else {
    // Default to year for other goal types
    periodStart = new Date(goal.year, 0, 1);
    periodEnd = new Date(goal.year, 11, 31, 23, 59, 59, 999);
  }

  const totalDays = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysPassed = Math.max(0, Math.floor(
    (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  ));
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  // Calculate expected progress based on time elapsed
  const progressRatio = Math.min(1, Math.max(0, daysPassed / totalDays));
  const expected = Math.max(0, Math.floor(goal.target * progressRatio));
  const difference = goal.current - expected;

  let status: "ahead" | "on_track" | "behind";
  if (difference > 0) {
    status = "ahead";
  } else if (difference < 0) {
    status = "behind";
  } else {
    status = "on_track";
  }

  // Calculate catch-up rate needed (in the same unit as the goal)
  let catchUpRate: number | undefined;
  if (status === "behind" && daysRemaining > 0) {
    const remaining = goal.target - goal.current;
    catchUpRate = Math.ceil(remaining / daysRemaining);
  }

  return { expected, difference, status, catchUpRate };
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
  if (goal.type === "pages") {
    return `${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} Pages`;
  }
  if (goal.type === "genres") {
    return `${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} Genres`;
  }
  if (goal.type === "consistency") {
    return `${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} Days`;
  }
  return `${goal.current.toLocaleString()} / ${goal.target.toLocaleString()} Books`;
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

/**
 * Estimate days to complete a pages goal based on average pages per day
 * Uses the 30-day rolling average from reading sessions
 */
export function estimateDaysForPages(
  targetPages: number,
  avgPagesPerDay: number
): string {
  if (avgPagesPerDay <= 0) return "unknown (no reading data yet)";
  
  const days = Math.ceil(targetPages / avgPagesPerDay);
  
  if (days === 1) return "~1 day";
  if (days < 7) return `~${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "~1 week" : `~${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "~1 month" : `~${months} months`;
  }
  const years = Math.round(days / 365 * 10) / 10;
  return years === 1 ? "~1 year" : `~${years} years`;
}

/**
 * Estimate days to complete a books goal based on average books per month
 * Uses the 30-day rolling average from reading sessions
 */
export function estimateDaysForBooks(
  targetBooks: number,
  avgPagesPerDay: number,
  avgPagesPerBook: number = 300 // Default average book length
): string {
  if (avgPagesPerDay <= 0) return "unknown (no reading data yet)";
  
  const totalPages = targetBooks * avgPagesPerBook;
  const days = Math.ceil(totalPages / avgPagesPerDay);
  
  if (days === 1) return "~1 day";
  if (days < 7) return `~${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "~1 week" : `~${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "~1 month" : `~${months} months`;
  }
  const years = Math.round(days / 365 * 10) / 10;
  return years === 1 ? "~1 year" : `~${years} years`;
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
