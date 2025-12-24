export type UserPlan = "FREE" | "PREMIUM";

export type GoalType = "books" | "pages" | "genres" | "consistency";

export interface ReadingGoal {
  id: string;
  type: GoalType;
  target: number;
  current: number;
  year: number;
  isPublic: boolean;
  genres?: string[];
  // Time period for books goals (in months, or custom dates)
  periodMonths?: number; // 3, 6, 9, 12, or undefined for custom
  startDate?: Date; // Custom start date
  endDate?: Date; // Custom end date
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  plan: UserPlan;
  currentGoal: ReadingGoal | null;
  averageReadingSpeed: number; // pages per hour
  streak: number;
}

// Mock user for development
export const mockFreeUser: User = {
  id: "1",
  name: "Alex Reader",
  plan: "FREE",
  currentGoal: {
    id: "goal-1",
    type: "books",
    target: 20,
    current: 12,
    year: 2025,
    isPublic: true,
    createdAt: new Date("2025-01-01"),
  },
  averageReadingSpeed: 30,
  streak: 7,
};

export const mockPremiumUser: User = {
  id: "2",
  name: "Sarah Bibliophile",
  plan: "PREMIUM",
  currentGoal: {
    id: "goal-2",
    type: "pages",
    target: 10000,
    current: 6500,
    year: 2025,
    isPublic: false,
    createdAt: new Date("2025-01-01"),
  },
  averageReadingSpeed: 45,
  streak: 23,
};

export const mockCompletedGoal: User = {
  id: "3",
  name: "Completed Reader",
  plan: "PREMIUM",
  currentGoal: {
    id: "goal-3",
    type: "books",
    target: 20,
    current: 20,
    year: 2025,
    isPublic: true,
    createdAt: new Date("2025-01-01"),
  },
  averageReadingSpeed: 35,
  streak: 45,
};
