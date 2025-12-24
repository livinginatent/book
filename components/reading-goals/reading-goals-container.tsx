"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveReadingGoal, updateGoalProgress, getActiveGoal, increaseGoalTarget } from "@/app/actions/reading-goals";
import { useProfile } from "@/hooks/use-profile";
import type { ReadingGoal } from "@/types/user.type";
import { GoalSettingWizard } from "./goal-setting-wizard";
import { ReadingGoalWidget } from "./reading-goal-widget";
// Toast notifications - can be replaced with your preferred toast library
const toast = {
  success: (message: string) => console.log("Success:", message),
  error: (message: string) => console.error("Error:", message),
};

interface ReadingGoalsContainerProps {
  className?: string;
}

export function ReadingGoalsContainer({ className }: ReadingGoalsContainerProps) {
  const { profile, isPremium, loading: profileLoading } = useProfile();
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshGoal = async () => {
    const result = await getActiveGoal();
    if (result.success) {
      setGoal(result.goal);
    }
  };

  // Fetch active goal on mount
  useEffect(() => {
    async function fetchGoal() {
      const result = await getActiveGoal();
      if (result.success) {
        setGoal(result.goal);
      }
      setLoading(false);
    }
    fetchGoal();
  }, []);

  // Listen for book status changes to refresh goal progress
  useEffect(() => {
    const handleStatusChange = async () => {
      // Refresh goal to get updated progress
      await refreshGoal();
      router.refresh();
    };

    window.addEventListener("book-status-changed", handleStatusChange);
    return () => {
      window.removeEventListener("book-status-changed", handleStatusChange);
    };
  }, [router]);

  // Create user object for components
  const user = profile
    ? {
        id: profile.id,
        name: profile.full_name || profile.username || profile.email || "User",
        plan: isPremium ? "PREMIUM" : "FREE",
        currentGoal: goal,
        averageReadingSpeed: 30, // Default, could be fetched from profile
        streak: 0, // Could be fetched from reading stats
      }
    : null;

  const handleSaveGoal = async (goalData: Partial<ReadingGoal>) => {
    const result = await saveReadingGoal(goalData);
    if (result.success) {
      setGoal(result.goal);
      toast.success("Goal created successfully!");
      await refreshGoal(); // Refresh to ensure we have the latest data
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  // Progress is now automatically calculated from user_books
  // This function is kept for backward compatibility but just refreshes
  const handleUpdateProgress = async () => {
    await refreshGoal();
    router.refresh();
  };

  const handleIncreaseGoal = async () => {
    const result = await increaseGoalTarget(10);
    if (result.success) {
      setGoal(result.goal);
      toast.success("Goal increased!");
      await refreshGoal(); // Refresh to ensure we have the latest data
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleShare = () => {
    if (goal) {
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
    }
  };

  if (profileLoading || loading || !user) {
    return (
      <div className={className}>
        <div className="animate-pulse rounded-lg bg-secondary h-48" />
      </div>
    );
  }

  return (
    <>
      <ReadingGoalWidget
        user={user}
        onSetGoal={() => setWizardOpen(true)}
        onUpdateProgress={handleUpdateProgress}
        onIncreaseGoal={handleIncreaseGoal}
        onShare={handleShare}
        className={className}
      />
      <GoalSettingWizard
        user={user}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSaveGoal={handleSaveGoal}
      />
    </>
  );
}

