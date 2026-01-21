import { motion, AnimatePresence } from "framer-motion";
import {
  
  BookOpen,
  FileText,
  Tags,
  Calendar,
  Lock,
  Globe,
  Eye,
  ChevronRight,
  ChevronLeft,
  X,
  CalendarDays,
  LoaderCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { GiTargetArrows } from "react-icons/gi";

import { getReadingStats } from "@/app/actions/reading-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVAILABLE_GENRES,
  estimateDaysForPages,
  estimateDaysForBooks,
} from "@/lib/goal-wizard/goals";
import { cn } from "@/lib/utils";
import { User, GoalType, ReadingGoal } from "@/types/user.type";

interface GoalSettingWizardProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (goal: Partial<ReadingGoal>) => void;
}

type Step = "type" | "target" | "period" | "privacy";

const goalTypeOptions: Array<{
  type: GoalType;
  label: string;
  description: string;
  icon: React.ElementType;
  premiumOnly: boolean;
}> = [
  {
    type: "books",
    label: "Number of Books",
    description: "Track the number of books you read",
    icon: BookOpen,
    premiumOnly: false,
  },
  {
    type: "pages",
    label: "Total Pages",
    description: "Track pages for more precision",
    icon: FileText,
    premiumOnly: true,
  },
  {
    type: "genres",
    label: "Genre Diversity",
    description: "Read X books from Y different genres",
    icon: Tags,
    premiumOnly: true,
  },
  {
    type: "consistency",
    label: "Consistency",
    description: "Read every day for X days",
    icon: Calendar,
    premiumOnly: true,
  },
];

export function GoalSettingWizard({
  user,
  open,
  onOpenChange,
  onSaveGoal,
}: GoalSettingWizardProps) {
  // Check premium status - user.plan can be "PREMIUM" or "FREE"
  // Also accept subscription_tier if passed via user object
  const isPremium =
    user.plan === "PREMIUM" || (user as any).subscriptionTier === "bibliophile";
  const [step, setStep] = useState<Step>("type");
  const [goalType, setGoalType] = useState<GoalType>("books");
  const [target, setTarget] = useState<number>(12);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [periodMonths, setPeriodMonths] = useState<number | null>(12); // 3, 6, 9, 12, or null for custom
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [avgPagesPerDay, setAvgPagesPerDay] = useState<number>(0);

  // Determine steps based on goal type
  const steps: Step[] =
    goalType === "books"
      ? ["type", "target", "period", "privacy"]
      : ["type", "target", "privacy"];
  const currentStepIndex = steps.indexOf(step);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setStep("type");
      setGoalType("books");
      setTarget(12);
      setSelectedGenres([]);
      setIsPublic(true);
      setPeriodMonths(12);
      setCustomStartDate("");
      setCustomEndDate("");
      setIsSaving(false);

      // Fetch 30-day reading average
      getReadingStats("1month").then((result) => {
        if (result.success) {
          setAvgPagesPerDay(result.avgPagesPerDay);
        }
      });
    }
  }, [open]);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Calculate start and end dates based on period
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (goalType === "books" && periodMonths) {
        // Preset period (3, 6, 9, 12 months) - start from today
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Start of day
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + periodMonths);
        endDate.setHours(23, 59, 59, 999); // End of day
      } else if (goalType === "books" && customStartDate && customEndDate) {
        // Custom period
        startDate = new Date(customStartDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to current year for other goal types
        startDate = new Date(currentYear, 0, 1);
        endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);
      }

      // Call onSaveGoal - it may be async, so we'll handle it accordingly
      const savePromise = Promise.resolve(
        onSaveGoal({
          type: goalType,
          target: goalType === "genres" ? selectedGenres.length : target,
          genres: goalType === "genres" ? selectedGenres : undefined,
          isPublic,
          year: currentYear,
          current: 0,
          periodMonths:
            goalType === "books" ? periodMonths || undefined : undefined,
          startDate: goalType === "books" ? startDate : undefined,
          endDate: goalType === "books" ? endDate : undefined,
        })
      );

      // Wait for the save operation to complete
      await savePromise;

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving goal:", error);
      // Keep dialog open on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setStep("type");
    setGoalType("books");
    setTarget(12);
    setSelectedGenres([]);
    setIsPublic(true);
    setPeriodMonths(12);
    setCustomStartDate("");
    setCustomEndDate("");
    setIsSaving(false);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 5
        ? [...prev, genre]
        : prev
    );
  };

  const canProceed = () => {
    if (step === "type") return true;
    if (step === "target") {
      if (goalType === "genres") return selectedGenres.length >= 3;
      if (goalType === "consistency") return target > 0;
      return target > 0;
    }
    if (step === "period") {
      // For books goals, require either preset period or custom dates
      if (goalType === "books") {
        if (periodMonths) return true; // Preset period selected
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return end > start; // End date must be after start date
        }
        return false;
      }
      return true;
    }
    return true;
  };

  // Calculate estimated time based on 30-day reading average
  const estimatedDays =
    goalType === "pages" && target > 0 && avgPagesPerDay > 0
      ? estimateDaysForPages(target, avgPagesPerDay)
      : goalType === "books" && target > 0 && avgPagesPerDay > 0
      ? estimateDaysForBooks(target, avgPagesPerDay)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b border-border p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <GiTargetArrows className="h-5 w-5 text-primary" />
              Set Reading Goal
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex gap-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= currentStepIndex ? "bg-primary" : "bg-secondary"
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-[300px] p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Goal Type */}
            {step === "type" && (
              <motion.div
                key="type"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="mb-1 font-medium">Choose your goal type</h3>
                  <p className="text-sm text-muted-foreground">
                    What would you like to track?
                  </p>
                </div>

                <div className="space-y-2">
                  {goalTypeOptions.map((option) => {
                    const isLocked = option.premiumOnly && !isPremium;
                    const isSelected = goalType === option.type;
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.type}
                        onClick={() => !isLocked && setGoalType(option.type)}
                        disabled={isLocked}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all",
                          isSelected && !isLocked
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50",
                          isLocked && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-lg p-2",
                            isSelected && !isLocked
                              ? "bg-primary/10"
                              : "bg-secondary"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              isSelected && !isLocked
                                ? "text-primary"
                                : "text-muted-foreground"
                            )}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            {isLocked && (
                              <Badge
                                variant="secondary"
                                className="gap-1 text-xs"
                              >
                                <Lock className="h-3 w-3" />
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>

                        {isSelected && !isLocked && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Target */}
            {step === "target" && (
              <motion.div
                key="target"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {goalType === "genres" ? (
                  <>
                    <div>
                      <h3 className="mb-1 font-medium">
                        Select genres to explore
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Choose 3-5 genres to read this year
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_GENRES.map((genre: string) => {
                        const isSelected = selectedGenres.includes(genre);
                        return (
                          <Badge
                            key={genre}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer transition-all hover:scale-105",
                              isSelected && "bg-primary"
                            )}
                            onClick={() => toggleGenre(genre)}
                          >
                            {genre}
                          </Badge>
                        );
                      })}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {selectedGenres.length}/5 genres selected
                    </p>
                  </>
                ) : goalType === "consistency" ? (
                  <>
                    <div>
                      <h3 className="mb-1 font-medium">
                        Set your consistency goal
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        How many consecutive days do you want to read?
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="target">Days</Label>
                      <Input
                        id="target"
                        type="number"
                        min={1}
                        value={target}
                        onChange={(e) =>
                          setTarget(parseInt(e.target.value) || 0)
                        }
                        className="text-2xl font-bold"
                      />
                    </div>

                    {/* Quick select buttons */}
                    <div className="flex gap-2">
                      {[7, 30, 60, 90].map((preset) => (
                        <Button
                          key={preset}
                          variant={target === preset ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTarget(preset)}
                        >
                          {preset} days
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="mb-1 font-medium">
                        Set your {goalType === "books" ? "book" : "page"} target
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        How many {goalType === "books" ? "books" : "pages"} do
                        you want to read?
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="target">Target</Label>
                      <Input
                        id="target"
                        type="number"
                        min={1}
                        value={target}
                        onChange={(e) =>
                          setTarget(parseInt(e.target.value) || 0)
                        }
                        className="text-2xl font-bold"
                      />
                      {estimatedDays && (
                        <p className="text-sm text-muted-foreground">
                          Based on your last 30 days ({avgPagesPerDay}{" "}
                          pages/day), this will take {estimatedDays}
                        </p>
                      )}
                    </div>

                    {/* Quick select buttons */}
                    <div className="flex gap-2">
                      {(goalType === "books"
                        ? [12, 24, 52]
                        : [5000, 10000, 15000]
                      ).map((preset) => (
                        <Button
                          key={preset}
                          variant={target === preset ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTarget(preset)}
                        >
                          {preset.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 3: Period (only for books goals) */}
            {step === "period" && goalType === "books" && (
              <motion.div
                key="period"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="mb-1 font-medium">Choose time period</h3>
                  <p className="text-sm text-muted-foreground">
                    How long do you want to track this goal?
                  </p>
                </div>

                {/* Preset periods */}
                <div className="space-y-2">
                  <Label>Preset periods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[3, 6, 9, 12].map((months) => (
                      <Button
                        key={months}
                        variant={
                          periodMonths === months ? "default" : "outline"
                        }
                        onClick={() => {
                          setPeriodMonths(months);
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }}
                        className="gap-2"
                      >
                        <CalendarDays className="h-4 w-4" />
                        {months} months
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom period */}
                <div className="space-y-2">
                  <Label>Or choose custom dates</Label>
                  <Button
                    variant={periodMonths === null ? "default" : "outline"}
                    onClick={() => {
                      setPeriodMonths(null);
                      if (!customStartDate) {
                        const today = new Date();
                        setCustomStartDate(today.toISOString().split("T")[0]);
                        const endDate = new Date(today);
                        endDate.setMonth(endDate.getMonth() + 3);
                        setCustomEndDate(endDate.toISOString().split("T")[0]);
                      }
                    }}
                    className="w-full gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Custom Period
                  </Button>

                  {periodMonths === null && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="space-y-1">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          min={customStartDate || undefined}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Period preview */}
                {periodMonths && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Goal period: {periodMonths} months starting from today
                    </p>
                    {avgPagesPerDay > 0 && (
                      <p className="text-muted-foreground">
                        Based on your pace ({avgPagesPerDay} pages/day), this
                        will take {estimateDaysForBooks(target, avgPagesPerDay)}
                      </p>
                    )}
                  </div>
                )}
                {periodMonths === null && customStartDate && customEndDate && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm space-y-1">
                    <p className="text-muted-foreground">
                      Goal period:{" "}
                      {new Date(customStartDate).toLocaleDateString()} to{" "}
                      {new Date(customEndDate).toLocaleDateString()}
                    </p>
                    {avgPagesPerDay > 0 && (
                      <p className="text-muted-foreground">
                        Based on your pace ({avgPagesPerDay} pages/day), this
                        will take {estimateDaysForBooks(target, avgPagesPerDay)}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3/4: Privacy */}
            {step === "privacy" && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="mb-1 font-medium">Goal visibility</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose who can see your reading goal
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      isPublic
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Globe
                      className={cn(
                        "h-5 w-5",
                        isPublic ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="flex-1">
                      <span className="font-medium">Public</span>
                      <p className="text-sm text-muted-foreground">
                        Visible on your profile
                      </p>
                    </div>
                    {isPublic && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsPublic(false)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      !isPublic
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Eye
                      className={cn(
                        "h-5 w-5",
                        !isPublic ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <div className="flex-1">
                      <span className="font-medium">Private</span>
                      <p className="text-sm text-muted-foreground">
                        Only you can see this goal
                      </p>
                    </div>
                    {!isPublic && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Summary
                  </h4>
                  <p className="text-sm">
                    {goalType === "genres"
                      ? `Read from ${selectedGenres.length} different genres`
                      : goalType === "consistency"
                      ? `Read every day for ${target} days`
                      : goalType === "books" && periodMonths
                      ? `Read ${target.toLocaleString()} books in ${periodMonths} months`
                      : goalType === "books" &&
                        periodMonths === null &&
                        customStartDate &&
                        customEndDate
                      ? `Read ${target.toLocaleString()} books from ${new Date(
                          customStartDate
                        ).toLocaleDateString()} to ${new Date(
                          customEndDate
                        ).toLocaleDateString()}`
                      : `Read ${target.toLocaleString()} ${goalType}`}{" "}
                    {goalType !== "books" && `in ${new Date().getFullYear()}`}
                  </p>
                  {avgPagesPerDay > 0 &&
                    (goalType === "books" || goalType === "pages") && (
                      <p className="text-xs text-muted-foreground">
                        Estimated time:{" "}
                        {goalType === "pages"
                          ? estimateDaysForPages(target, avgPagesPerDay)
                          : estimateDaysForBooks(target, avgPagesPerDay)}{" "}
                        (based on {avgPagesPerDay} pages/day)
                      </p>
                    )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isSaving}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                {currentStepIndex === steps.length - 1 ? "Create Goal" : "Next"}
                {currentStepIndex < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
