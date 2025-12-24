import { motion } from "framer-motion";
import { Target, Flame, Plus, MoreVertical, Trash2, Edit } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  onDeleteGoal?: () => void;
  className?: string;
}

export function ReadingGoalWidget({
  user,
  onSetGoal,
  onIncreaseGoal,
  onShare,
  onDeleteGoal,
  className,
}: ReadingGoalWidgetProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const goal = user.currentGoal;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  // No goal set state
  if (!goal) {
    return (
      <Card className={cn("border-dashed h-[360px] flex flex-col", className)}>
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

  // Get goal name based on type
  const getGoalName = () => {
    switch (goal.type) {
      case "books":
        if (goal.periodMonths) {
          return `${goal.periodMonths}-Month Reading Goal`;
        }
        if (goal.startDate && goal.endDate) {
          return "Custom Period Reading Goal";
        }
        return `${goal.year} Books Goal`;
      case "pages":
        return `${goal.year} Pages Goal`;
      case "genres":
        return `${goal.year} Genre Diversity Goal`;
      case "consistency":
        return `${goal.year} Consistency Goal`;
      default:
        return `${goal.year} Reading Goal`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn("overflow-hidden h-[330px] flex flex-col", className)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{getGoalName()}</h3>
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

        <CardContent className="space-y-3 flex-1">
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

          {/* Action buttons with dropdown */}
          <div className="relative" ref={menuRef}>
            <Button
              onClick={() => setShowMenu(!showMenu)}
              variant="outline"
              className="w-full gap-2"
            >
              <Target className="h-4 w-4" />
              Change Goal
              <MoreVertical className="h-4 w-4 ml-auto" />
            </Button>

            {/* Dropdown menu */}
            {showMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-md shadow-lg z-10 overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onSetGoal?.();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-accent transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Change Goal
                </button>
                {onDeleteGoal && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteGoal();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Goal
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
