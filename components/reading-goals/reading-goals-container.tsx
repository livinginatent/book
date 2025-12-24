"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import {
  getAllActiveGoals,
  canCreateGoal,
  createReadingGoal,
  increaseGoalTarget,
} from "@/app/actions/reading-goals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { componentGoalToDbGoal } from "@/lib/goal-wizard/goal-converters";
import { cn } from "@/lib/utils";
import type { ReadingGoal, UserPlan } from "@/types/user.type";

import { GoalSettingWizard } from "./goal-setting-wizard";
import { ReadingGoalWidget } from "./reading-goal-widget";

// Toast notifications - can be replaced with your preferred toast library
const toast = {
  success: (message: string) => {
    // eslint-disable-next-line no-console
    console.log("Success:", message);
  },
  error: (message: string) => console.error("Error:", message),
};

interface ReadingGoalsContainerProps {
  className?: string;
}

export function ReadingGoalsContainer({
  className,
}: ReadingGoalsContainerProps) {
  const { profile, isPremium, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [goalLimit, setGoalLimit] = useState({ current: 0, limit: 3 });

  const refreshGoals = useCallback(async () => {
    if (!profile?.id) return;

    const [goalsResult, limitResult] = await Promise.all([
      getAllActiveGoals(),
      canCreateGoal(profile.id),
    ]);

    if (goalsResult.success) {
      setGoals(goalsResult.goals);
    }

    if (limitResult.success) {
      setCanCreate(limitResult.canCreate);
      setGoalLimit({
        current: limitResult.currentCount,
        limit: limitResult.limit,
      });
    }
  }, [profile]);

  // Fetch all active goals and check limit on mount
  useEffect(() => {
    async function fetchData() {
      if (profile?.id) {
        await refreshGoals();
      }
      setLoading(false);
    }
    fetchData();
  }, [profile, refreshGoals]);

  // Listen for book status changes to refresh goal progress
  useEffect(() => {
    const handleStatusChange = async () => {
      await refreshGoals();
      router.refresh();
    };

    window.addEventListener("book-status-changed", handleStatusChange);
    return () => {
      window.removeEventListener("book-status-changed", handleStatusChange);
    };
  }, [router, refreshGoals, profile]);

  // Create user object for components
  const user = profile
    ? {
        id: profile.id,
        name: profile.full_name || profile.username || profile.email || "User",
        plan: (isPremium ? "PREMIUM" : "FREE") as UserPlan,
        currentGoal: goals[0] || null, // For backward compatibility
        averageReadingSpeed: 30, // Default, could be fetched from profile
        streak: 0, // Could be fetched from reading stats
      }
    : null;

  const handleSaveGoal = async (goalData: Partial<ReadingGoal>) => {
    if (!profile?.id) {
      toast.error("You must be logged in");
      return;
    }

    // Convert component goal format to DB format
    const { type, config } = componentGoalToDbGoal(goalData);

    const result = await createReadingGoal({
      type: type as "books" | "pages" | "diversity" | "consistency",
      config,
      isActive: true,
    });

    if (result.success) {
      toast.success("Goal created successfully!");
      await refreshGoals();
      router.refresh();
      setWizardOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const handleUpdateProgress = async () => {
    await refreshGoals();
    router.refresh();
  };

  const handleIncreaseGoal = async () => {
    const result = await increaseGoalTarget(10);
    if (result.success) {
      toast.success("Goal increased!");
      await refreshGoals();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleShare = (goal: ReadingGoal) => {
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
    const text = `I've read ${goal.current} ${unit} out of my goal of ${goal.target} ${unit}!`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Goal copied to clipboard!");
    }
  };

  if (profileLoading || loading || !user) {
    return (
      <div className={className}>
        <div className="animate-pulse rounded-lg bg-secondary h-48" />
      </div>
    );
  }

  const showCreateButton = canCreate || goals.length === 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <ReadingGoalWidget
              key={goal.id}
              user={{
                ...user,
                currentGoal: goal,
              }}
              onSetGoal={() => setWizardOpen(true)}
              onUpdateProgress={handleUpdateProgress}
              onIncreaseGoal={handleIncreaseGoal}
              onShare={() => handleShare(goal)}
            />
          ))}
        </div>
      ) : null}

      {/* Create Goal Card - Always show when user can create or has no goals */}
      {showCreateButton && (
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              {goals.length === 0
                ? "Set Your First Reading Goal"
                : "Create Another Goal"}
            </h3>
            <p className="mb-6 text-sm text-muted-foreground max-w-md">
              {goals.length === 0
                ? "Track your progress and stay motivated on your reading journey"
                : `You have ${goalLimit.current} of ${goalLimit.limit} active goals. Create another to track different aspects of your reading.`}
            </p>
            <Button
              onClick={() => setWizardOpen(true)}
              size="lg"
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Limit Reached Message */}
      {!canCreate && goals.length > 0 && (
        <Card className="border-muted bg-muted/50">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              You&apos;ve reached your goal limit of {goalLimit.limit} active
              goals.
              {!isPremium && (
                <span className="block mt-1">
                  Upgrade to Bibliophile to create up to 12 goals.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      )}

      <GoalSettingWizard
        user={user}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSaveGoal={handleSaveGoal}
      />
    </div>
  );
}
