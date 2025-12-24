import type { ReadingGoal as DBReadingGoal } from "@/types/database.types";
import type { ReadingGoal, GoalType } from "@/types/user.type";

/**
 * Convert database goal format to component format
 * DB uses: { type, config: { target, current, year, is_public, genres? } }
 * Component uses: { type, target, current, year, isPublic, genres? }
 */
export function dbGoalToComponentGoal(
  dbGoal: DBReadingGoal
): ReadingGoal {
  const config = (dbGoal.config as Record<string, unknown>) || {};
  
  // Map 'diversity' type to 'genres' for component compatibility
  const componentType: GoalType = 
    dbGoal.type === "diversity" ? "genres" : dbGoal.type as GoalType;

  return {
    id: dbGoal.id,
    type: componentType,
    target: (config.target as number) || 0,
    current: (config.current as number) || 0,
    year: (config.year as number) || new Date().getFullYear(),
    isPublic: (config.is_public as boolean) ?? true,
    genres: config.genres as string[] | undefined,
    periodMonths: config.period_months as number | undefined,
    startDate: config.start_date ? new Date(config.start_date as string) : undefined,
    endDate: config.end_date ? new Date(config.end_date as string) : undefined,
    createdAt: new Date(dbGoal.created_at),
  };
}

/**
 * Convert component goal format to database format
 * Component uses: { type, target, current, year, isPublic, genres? }
 * DB uses: { type, config: { target, current, year, is_public, genres? } }
 */
export function componentGoalToDbGoal(
  componentGoal: Partial<ReadingGoal>
): {
  type: string;
  config: Record<string, unknown>;
} {
  // Map 'genres' type to 'diversity' for database
  const dbType = componentGoal.type === "genres" ? "diversity" : componentGoal.type || "books";

  const config: Record<string, unknown> = {
    target: componentGoal.target ?? 0,
    current: componentGoal.current ?? 0,
    year: componentGoal.year ?? new Date().getFullYear(),
    is_public: componentGoal.isPublic ?? true,
  };

  if (componentGoal.genres && componentGoal.genres.length > 0) {
    config.genres = componentGoal.genres;
  }

  // Add time period fields for books goals
  if (componentGoal.type === "books") {
    if (componentGoal.periodMonths !== undefined) {
      config.period_months = componentGoal.periodMonths;
    }
    if (componentGoal.startDate) {
      config.start_date = componentGoal.startDate.toISOString();
    }
    if (componentGoal.endDate) {
      config.end_date = componentGoal.endDate.toISOString();
    }
  }

  return {
    type: dbType,
    config,
  };
}

