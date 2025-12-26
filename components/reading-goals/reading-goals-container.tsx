"use client";

import {
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";

import {
  getAllActiveGoals,
  getAllAchievedGoals,
  canCreateGoal,
  createReadingGoal,
  increaseGoalTarget,
  deleteReadingGoal,
} from "@/app/actions/reading-goals";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent } from "@/components/ui/card";
import { componentGoalToDbGoal } from "@/lib/goal-wizard/goal-converters";
import { cn } from "@/lib/utils";
import type { ReadingGoal, UserPlan } from "@/types/user.type";

import { GoalSettingWizard } from "./goal-setting-wizard";
import { ReadingGoalWidget } from "./reading-goal-widget";

// Toast notifications - can be replaced with your preferred toast library
const toast = {
  success: (message: string) => {
    console.log("Success:", message);
  },
  error: (message: string) => console.error("Error:", message),
};

interface ReadingGoalsContainerProps {
  className?: string;
  initialProfile?: {
    id: string;
    subscription_tier?: string | null;
  } | null;
}

// Memoized components
const MemoizedReadingGoalWidget = memo(ReadingGoalWidget);
const MemoizedGoalSettingWizard = memo(GoalSettingWizard);

function ReadingGoalsContainerComponent({
  className,
  initialProfile,
}: ReadingGoalsContainerProps) {
  // Use the profile hook as fallback, but prefer initialProfile for immediate data
  const { profile: contextProfile, isPremium: contextIsPremium, loading: profileLoading } = useProfile();
  const router = useRouter();
  
  // Use initialProfile if available (server-fetched), otherwise fall back to context
  const profile = initialProfile || contextProfile;
  const isPremium = initialProfile 
    ? initialProfile.subscription_tier === "bibliophile"
    : contextIsPremium;
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [achievedGoals, setAchievedGoals] = useState<ReadingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [goalLimit, setGoalLimit] = useState({ current: 0, limit: 3 });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAchievedCollapsed, setIsAchievedCollapsed] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const activeGoalsScrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  // Memoize profile ID - use initialProfile first for immediate availability
  const profileId = profile?.id;

  // Get subscription tier for optimization
  const subscriptionTier = profile?.subscription_tier as "free" | "bibliophile" | undefined;
  
  // If we have initialProfile, we don't need to wait for context to load
  const effectiveProfileLoading = initialProfile ? false : profileLoading;

  const refreshGoals = useCallback(async (userId?: string, tier?: "free" | "bibliophile") => {
    // Use provided userId or fall back to profileId from state
    const id = userId || profileId;
    if (!id) return;

    const [goalsResult, achievedResult, limitResult] = await Promise.all([
      getAllActiveGoals(),
      getAllAchievedGoals(),
      canCreateGoal(id, tier || subscriptionTier),
    ]);

    if (!isMountedRef.current) return;

    if (goalsResult.success) {
      setGoals(goalsResult.goals);
    }

    if (achievedResult.success) {
      setAchievedGoals(achievedResult.goals);
    }

    if (limitResult.success) {
      setCanCreate(limitResult.canCreate);
      setGoalLimit({
        current: limitResult.currentCount,
        limit: limitResult.limit,
      });
    }
  }, [profileId, subscriptionTier]);

  // Track if we've done initial fetch for current user
  const lastFetchedUserRef = useRef<string | null>(null);

  // Fetch all active goals when profile becomes available
  useEffect(() => {
    isMountedRef.current = true;
    
    async function fetchData() {
      // Only fetch if we have a profile ID
      if (profileId) {
        // Only fetch if this is a new user (different from last fetched)
        const needsFetch = lastFetchedUserRef.current !== profileId;
        
        if (needsFetch) {
          setLoading(true);
          // Pass profileId directly to avoid stale closure issues
          await refreshGoals(profileId, subscriptionTier);
          lastFetchedUserRef.current = profileId;
        }
        
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
      // If profile finished loading and there's no profileId, we're not logged in
      else if (!effectiveProfileLoading) {
        lastFetchedUserRef.current = null;
        if (isMountedRef.current) {
          setLoading(false);
          setGoals([]);
          setAchievedGoals([]);
        }
      }
      // While profile is still loading, keep showing loading state
    }
    
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [profileId, effectiveProfileLoading, subscriptionTier, refreshGoals]);

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
  }, [router, refreshGoals]);

  // Update scroll arrow visibility
  const updateScrollArrows = useCallback(() => {
    if (activeGoalsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } =
        activeGoalsScrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  // Update scroll arrows when goals change or container opens
  useEffect(() => {
    if (!isCollapsed && goals.length > 3) {
      const timer = setTimeout(updateScrollArrows, 100);
      return () => clearTimeout(timer);
    }
  }, [goals.length, isCollapsed, updateScrollArrows]);

  // Update scroll arrows on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isCollapsed && goals.length > 3) {
        updateScrollArrows();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, goals.length, updateScrollArrows]);

  // Memoize user object for components - only recreate when dependencies change
  const user = useMemo(() => {
    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.full_name || profile.username || profile.email || "User",
      plan: (isPremium ? "PREMIUM" : "FREE") as UserPlan,
      currentGoal: goals[0] || null,
      averageReadingSpeed: 30,
      streak: 0,
    };
  }, [profile, isPremium, goals]);

  // Memoized handlers
  const handleSaveGoal = useCallback(async (goalData: Partial<ReadingGoal>) => {
    if (!profileId) {
      toast.error("You must be logged in");
      return;
    }

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
  }, [profileId, refreshGoals, router]);

  const handleUpdateProgress = useCallback(async () => {
    await refreshGoals();
    router.refresh();
  }, [refreshGoals, router]);

  const handleIncreaseGoal = useCallback(async () => {
    const result = await increaseGoalTarget(10);
    if (result.success) {
      toast.success("Goal increased!");
      await refreshGoals();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }, [refreshGoals, router]);

  const handleShare = useCallback((goal: ReadingGoal) => {
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
  }, []);

  const handleDeleteGoal = useCallback(async (goalId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this goal? This action cannot be undone."
      )
    ) {
      return;
    }

    const result = await deleteReadingGoal(goalId);
    if (result.success) {
      toast.success("Goal deleted successfully!");
      await refreshGoals();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }, [refreshGoals, router]);

  const handleOpenWizard = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const handleCloseWizard = useCallback((open: boolean) => {
    setWizardOpen(open);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const toggleAchievedCollapsed = useCallback(() => {
    setIsAchievedCollapsed((prev) => !prev);
  }, []);

  const scrollLeft = useCallback(() => {
    if (activeGoalsScrollRef.current) {
      const scrollAmount = activeGoalsScrollRef.current.clientWidth * 0.8;
      activeGoalsScrollRef.current.scrollBy({
        left: -scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (activeGoalsScrollRef.current) {
      const scrollAmount = activeGoalsScrollRef.current.clientWidth * 0.8;
      activeGoalsScrollRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  }, []);

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
      {/* Collapsible Header */}
      <button
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Reading Goals</h3>
            <p className="text-sm text-muted-foreground">
              {goals.length === 0
                ? "No active goals"
                : `${goals.length} active goal${goals.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Collapsible Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        )}
      >
        <div className="space-y-4">
          {/* Active Goals - Horizontal Scroll if > 3, otherwise Grid */}
          {goals.length > 0 ? (
            <div className="relative">
              {goals.length > 3 ? (
                <>
                  {/* Left Arrow */}
                  {canScrollLeft && (
                    <button
                      onClick={scrollLeft}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background border border-border shadow-lg p-2 hover:bg-accent transition-colors"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Scrollable Container */}
                  <div
                    ref={activeGoalsScrollRef}
                    onScroll={updateScrollArrows}
                    className="flex gap-4 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  >
                    {goals.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex-shrink-0 w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
                      >
                        <MemoizedReadingGoalWidget
                          user={{
                            ...user,
                            currentGoal: goal,
                          }}
                          onSetGoal={handleOpenWizard}
                          onUpdateProgress={handleUpdateProgress}
                          onIncreaseGoal={handleIncreaseGoal}
                          onShare={() => handleShare(goal)}
                          onDeleteGoal={() => handleDeleteGoal(goal.id)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right Arrow */}
                  {canScrollRight && (
                    <button
                      onClick={scrollRight}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background border border-border shadow-lg p-2 hover:bg-accent transition-colors"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {goals.map((goal) => (
                    <MemoizedReadingGoalWidget
                      key={goal.id}
                      user={{
                        ...user,
                        currentGoal: goal,
                      }}
                      onSetGoal={handleOpenWizard}
                      onUpdateProgress={handleUpdateProgress}
                      onIncreaseGoal={handleIncreaseGoal}
                      onShare={() => handleShare(goal)}
                      onDeleteGoal={() => handleDeleteGoal(goal.id)}
                    />
                  ))}
                </div>
              )}
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
                  onClick={handleOpenWizard}
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
                  You&apos;ve reached your goal limit of {goalLimit.limit}{" "}
                  active goals.
                  {!isPremium && (
                    <span className="block mt-1">
                      Upgrade to Bibliophile to create up to 12 goals.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          )}

          <MemoizedGoalSettingWizard
            user={user}
            open={wizardOpen}
            onOpenChange={handleCloseWizard}
            onSaveGoal={handleSaveGoal}
          />
        </div>
      </div>

      {/* Achieved Goals Section */}
      {achievedGoals.length > 0 && (
        <>
          <button
            onClick={toggleAchievedCollapsed}
            className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Achieved Goals</h3>
                <p className="text-sm text-muted-foreground">
                  {achievedGoals.length} completed goal
                  {achievedGoals.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {isAchievedCollapsed ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* Achieved Goals Collapsible Content */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              isAchievedCollapsed
                ? "max-h-0 opacity-0"
                : "max-h-[5000px] opacity-100"
            )}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              {achievedGoals.map((goal) => (
                <MemoizedReadingGoalWidget
                  key={goal.id}
                  user={{
                    ...user,
                    currentGoal: goal,
                  }}
                  onSetGoal={handleOpenWizard}
                  onUpdateProgress={handleUpdateProgress}
                  onIncreaseGoal={handleIncreaseGoal}
                  onShare={() => handleShare(goal)}
                  onDeleteGoal={() => handleDeleteGoal(goal.id)}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Export memoized component
export const ReadingGoalsContainer = memo(ReadingGoalsContainerComponent);
