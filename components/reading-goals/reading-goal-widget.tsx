import { motion } from "framer-motion";
import { Target, Flame, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  calculatePace,
  getProgressPercentage,
  getPacePercentage,
  formatGoalProgress,
  isGoalCompleted,
} from "@/lib/goal-wizard/goals";
import { cn } from "@/lib/utils";
import { User } from "@/types/user.type";

import { AnimatedProgress } from "./animated-progress";
import { CelebrationWidget } from "./celebration-widget";
import { PaceIndicator } from "./pace-indicator";


interface ReadingGoalWidgetProps {
  user: User;
  onUpdateProgress?: () => void;
  onSetGoal?: () => void;
  onIncreaseGoal?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ReadingGoalWidget({
  user,
  onSetGoal,
  onIncreaseGoal,
  onShare,
  className,
}: ReadingGoalWidgetProps) {
  const goal = user.currentGoal;

  // No goal set state
  if (!goal) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-secondary p-3">
            <Target className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Set Your Reading Goal</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Track your progress and stay motivated
          </p>
          <Button onClick={onSetGoal} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Goal
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Goal completed state
  if (isGoalCompleted(goal)) {
    return (
      <CelebrationWidget
        user={user}
        onIncreaseGoal={onIncreaseGoal}
        onShare={onShare}
        className={className}
      />
    );
  }

  const pace = calculatePace(goal);
  const progressPercent = getProgressPercentage(goal);
  const pacePercent = getPacePercentage(goal);
  
  const getUnit = () => {
    switch (goal.type) {
      case "pages":
        return "pages";
      case "genres":
        return "genres";
      case "consistency":
        return "days";
      default:
        return "books";
    }
  };
  
  const unit = getUnit();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {goal.type === "books" && goal.periodMonths
                    ? `${goal.periodMonths}-Month Reading Goal`
                    : goal.type === "books" && goal.startDate && goal.endDate
                    ? "Custom Period Reading Goal"
                    : `${goal.year} Reading Goal`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatGoalProgress(goal)}
                </p>
              </div>
            </div>

            {/* Streak badge */}
            {user.streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                <Flame className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {user.streak}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <AnimatedProgress
              value={progressPercent}
              paceValue={pacePercent}
              className="h-3"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Today&apos;s pace</span>
              <span>{Math.round(pacePercent)}% expected</span>
            </div>
          </div>

          {/* Pace indicator */}
          <PaceIndicator
            status={pace.status}
            difference={pace.difference}
            catchUpRate={pace.catchUpRate}
            unit={unit}
          />

          {/* Action button */}
          <Button
            onClick={onSetGoal}
            variant="outline"
            className="w-full gap-2"
          >
            <Target className="h-4 w-4" />
            Change Goal
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
