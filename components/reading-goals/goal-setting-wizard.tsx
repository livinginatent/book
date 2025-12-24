import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  BookOpen,
  FileText,
  Tags,
  Lock,
  Globe,
  Eye,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { useState } from "react";

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
import { cn } from "@/lib/utils";
import { User, GoalType, ReadingGoal } from "@/types/user.type";
import { AVAILABLE_GENRES, estimateReadingTime } from "@/lib/goal-wizard/goals";


interface GoalSettingWizardProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveGoal: (goal: Partial<ReadingGoal>) => void;
}

type Step = "type" | "target" | "privacy";

const goalTypeOptions: Array<{
  type: GoalType;
  label: string;
  description: string;
  icon: React.ElementType;
  premiumOnly: boolean;
}> = [
  {
    type: "books",
    label: "Total Books",
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
    description: "Explore different genres",
    icon: Tags,
    premiumOnly: true,
  },
];

export function GoalSettingWizard({
  user,
  open,
  onOpenChange,
  onSaveGoal,
}: GoalSettingWizardProps) {
  const isPremium = user.plan === "PREMIUM";
  const [step, setStep] = useState<Step>("type");
  const [goalType, setGoalType] = useState<GoalType>("books");
  const [target, setTarget] = useState<number>(12);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const steps: Step[] = ["type", "target", "privacy"];
  const currentStepIndex = steps.indexOf(step);

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

  const handleSave = () => {
    onSaveGoal({
      type: goalType,
      target: goalType === "genres" ? selectedGenres.length : target,
      genres: goalType === "genres" ? selectedGenres : undefined,
      isPublic,
      year: new Date().getFullYear(),
      current: 0,
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep("type");
    setGoalType("books");
    setTarget(12);
    setSelectedGenres([]);
    setIsPublic(true);
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
      return target > 0;
    }
    return true;
  };

  const estimatedTime =
    goalType === "pages" && target > 0
      ? estimateReadingTime(target, user.averageReadingSpeed)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Set Reading Goal
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
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
                      {AVAILABLE_GENRES.map((genre:string) => {
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
                      {goalType === "pages" && estimatedTime && (
                        <p className="text-sm text-muted-foreground">
                          Based on your reading speed, this will take{" "}
                          {estimatedTime}
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

            {/* Step 3: Privacy */}
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
                <div className="rounded-lg bg-secondary/50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Summary
                  </h4>
                  <p className="text-sm">
                    {goalType === "genres"
                      ? `Read from ${selectedGenres.length} different genres`
                      : `Read ${target.toLocaleString()} ${goalType}`}{" "}
                    in {new Date().getFullYear()}
                  </p>
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
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            {currentStepIndex === steps.length - 1 ? "Create Goal" : "Next"}
            {currentStepIndex < steps.length - 1 && (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
