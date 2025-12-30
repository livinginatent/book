"use client";

import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { updateBookReview } from "@/app/actions/reviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormMessage } from "@/components/ui/form-message";
import { cn } from "@/lib/utils";

interface BookReviewFormProps {
  bookId: string;
  initialRating?: number | null;
  initialAttributes?: {
    moods?: string[];
    pacing?: string | null;
    plot_or_character?: string | null;
    difficulty?: string | null;
    content_warnings?: string[];
    diverse_cast?: boolean;
    character_development?: boolean;
    plot_driven?: boolean;
    strong_prose?: boolean;
    world_building?: boolean;
    twist_ending?: boolean;
    multiple_pov?: boolean;
  };
  onSuccess?: (rating: number) => void;
  className?: string;
}

const MOODS = [
  "Dark",
  "Emotional",
  "Lighthearted",
  "Tense",
  "Reflective",
  "Hopeful",
  "Melancholic",
  "Humorous",
  "Suspenseful",
  "Romantic",
  "Mysterious",
  "Inspiring",
  "Thought-provoking",
  "Adventurous",
  "Nostalgic",
] as const;

const PACING_OPTIONS = ["Slow", "Medium", "Fast"] as const;
const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard"] as const;

const INITIAL_MOODS_DISPLAY = 5;

type Mood = (typeof MOODS)[number];
type Pacing = (typeof PACING_OPTIONS)[number];
type Difficulty = (typeof DIFFICULTY_OPTIONS)[number];

/**
 * Round a number to the nearest 0.25
 */
function roundToQuarter(value: number): number {
  return Math.round(value * 4) / 4;
}

/**
 * Star Rating Component - Stars for full ratings, buttons for increments
 */
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [showIncrements, setShowIncrements] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleStarClick = (starValue: number) => {
    onChange(starValue);
  };

  const handleIncrementClick = (baseRating: number, increment: number) => {
    const newValue = baseRating + increment;
    const rounded = roundToQuarter(newValue);
    onChange(Math.min(5, Math.max(0, rounded)));
  };

  const displayValue = hoverValue ?? value;
  const baseRating = Math.floor(value);
  const hasIncrement = value % 1 !== 0;

  return (
    <div className="space-y-3">
      {/* Star Rating for Full Ratings */}
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((index) => {
          const starValue = index + 1;
          const isFull = displayValue >= starValue;

          return (
            <button
              key={index}
              type="button"
              className="relative flex cursor-pointer transition-transform hover:scale-110"
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              onMouseLeave={() => setHoverValue(null)}
              aria-label={`${starValue} stars`}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  isFull ? "fill-primary text-primary" : "text-border"
                )}
              />
            </button>
          );
        })}
        {value > 0 && (
          <span className="ml-2 text-sm text-muted-foreground">
            {value.toFixed(2)}
          </span>
        )}
      </div>

      {/* Increment Buttons (Optional) */}
      {value > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowIncrements(!showIncrements)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {showIncrements ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Hide increments
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Add increments ({baseRating}.25, {baseRating}.5, {baseRating}.75)
              </>
            )}
          </button>

          {showIncrements && (
            <div className="flex gap-2 flex-wrap">
              {baseRating < 5 && (
                <>
                  <Button
                    type="button"
                    variant={hasIncrement && value === baseRating + 0.25 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIncrementClick(baseRating, 0.25)}
                    className="text-xs"
                  >
                    {baseRating}.25
                  </Button>
                  <Button
                    type="button"
                    variant={hasIncrement && value === baseRating + 0.5 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIncrementClick(baseRating, 0.5)}
                    className="text-xs"
                  >
                    {baseRating}.5
                  </Button>
                  <Button
                    type="button"
                    variant={hasIncrement && value === baseRating + 0.75 ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIncrementClick(baseRating, 0.75)}
                    className="text-xs"
                  >
                    {baseRating}.75
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BookReviewForm({
  bookId,
  initialRating = null,
  initialAttributes = {},
  onSuccess,
  className,
}: BookReviewFormProps) {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [moods, setMoods] = useState<string[]>(initialAttributes.moods ?? []);
  const [pacing, setPacing] = useState<string | null>(
    initialAttributes.pacing ?? null
  );
  const [difficulty, setDifficulty] = useState<string | null>(
    initialAttributes.difficulty ?? null
  );
  const [diverseCast, setDiverseCast] = useState<boolean>(
    initialAttributes.diverse_cast ?? false
  );
  const [characterDevelopment, setCharacterDevelopment] = useState<boolean>(
    initialAttributes.character_development ?? false
  );
  const [plotDriven, setPlotDriven] = useState<boolean>(
    initialAttributes.plot_driven ?? false
  );
  const [strongProse, setStrongProse] = useState<boolean>(
    initialAttributes.strong_prose ?? false
  );
  const [worldBuilding, setWorldBuilding] = useState<boolean>(
    initialAttributes.world_building ?? false
  );
  const [twistEnding, setTwistEnding] = useState<boolean>(
    initialAttributes.twist_ending ?? false
  );
  const [multiplePOV, setMultiplePOV] = useState<boolean>(
    initialAttributes.multiple_pov ?? false
  );

  const [showAllMoods, setShowAllMoods] = useState(false);
  const [showDifficulty, setShowDifficulty] = useState(
    !!initialAttributes.difficulty
  );
  const [showMoreAttributes, setShowMoreAttributes] = useState(
    !!(
      initialAttributes.strong_prose ||
      initialAttributes.world_building ||
      initialAttributes.twist_ending ||
      initialAttributes.multiple_pov
    )
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const toggleMood = (mood: Mood) => {
    setMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const attributes = {
      moods,
      pacing,
      difficulty,
      diverse_cast: diverseCast,
      character_development: characterDevelopment,
      plot_driven: plotDriven,
      strong_prose: strongProse,
      world_building: worldBuilding,
      twist_ending: twistEnding,
      multiple_pov: multiplePOV,
    };

    const result = await updateBookReview(bookId, rating, attributes);

    setIsSubmitting(false);

    if (result.success) {
      setMessage({ type: "success", text: result.message });
      onSuccess?.(rating);
    } else {
      setMessage({ type: "error", text: result.error });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Star Rating */}
        <div className="space-y-2 md:col-span-2">
          <Label>Rating</Label>
          <StarRating value={rating} onChange={setRating} />
        </div>

        {/* Mood Tags */}
        <div className="space-y-2">
          <Label>Moods</Label>
          <div className="flex flex-wrap gap-2">
            {(showAllMoods ? MOODS : MOODS.slice(0, INITIAL_MOODS_DISPLAY)).map(
              (mood) => {
                const isSelected = moods.includes(mood);
                return (
                  <Badge
                    key={mood}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all hover:scale-105",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => toggleMood(mood)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleMood(mood);
                      }
                    }}
                  >
                    {mood}
                  </Badge>
                );
              }
            )}
          </div>
          {MOODS.length > INITIAL_MOODS_DISPLAY && (
            <button
              type="button"
              onClick={() => setShowAllMoods(!showAllMoods)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showAllMoods ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more ({MOODS.length - INITIAL_MOODS_DISPLAY} more)
                </>
              )}
            </button>
          )}
        </div>

        {/* Pacing */}
        <div className="space-y-2">
          <Label>Pacing</Label>
          <div className="flex flex-wrap gap-2">
            {PACING_OPTIONS.map((option) => {
              const isSelected = pacing === option;
              return (
                <Button
                  key={option}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPacing(isSelected ? null : option)}
                  className={cn(
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Difficulty (Collapsed by default) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Difficulty</Label>
            <button
              type="button"
              onClick={() => setShowDifficulty(!showDifficulty)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showDifficulty ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show
                </>
              )}
            </button>
          </div>
          {showDifficulty && (
            <div className="flex flex-wrap gap-2">
              {DIFFICULTY_OPTIONS.map((option) => {
                const isSelected = difficulty === option;
                return (
                  <Button
                    key={option}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(isSelected ? null : option)}
                    className={cn(
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Attributes */}
        <div className="space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Attributes</Label>
            <button
              type="button"
              onClick={() => setShowMoreAttributes(!showMoreAttributes)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              {showMoreAttributes ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show more
                </>
              )}
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="diverse-cast" className="font-normal cursor-pointer">
                Diverse Cast
              </Label>
              <Switch
                id="diverse-cast"
                checked={diverseCast}
                onCheckedChange={setDiverseCast}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="character-dev" className="font-normal cursor-pointer">
                Character Development
              </Label>
              <Switch
                id="character-dev"
                checked={characterDevelopment}
                onCheckedChange={setCharacterDevelopment}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="plot-driven" className="font-normal cursor-pointer">
                Plot-Driven
              </Label>
              <Switch
                id="plot-driven"
                checked={plotDriven}
                onCheckedChange={setPlotDriven}
              />
            </div>
            {showMoreAttributes && (
              <>
                <div className="flex items-center justify-between">
                  <Label htmlFor="strong-prose" className="font-normal cursor-pointer">
                    Strong Prose
                  </Label>
                  <Switch
                    id="strong-prose"
                    checked={strongProse}
                    onCheckedChange={setStrongProse}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="world-building" className="font-normal cursor-pointer">
                    World-Building
                  </Label>
                  <Switch
                    id="world-building"
                    checked={worldBuilding}
                    onCheckedChange={setWorldBuilding}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="twist-ending" className="font-normal cursor-pointer">
                    Twist Ending
                  </Label>
                  <Switch
                    id="twist-ending"
                    checked={twistEnding}
                    onCheckedChange={setTwistEnding}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="multiple-pov" className="font-normal cursor-pointer">
                    Multiple POV
                  </Label>
                  <Switch
                    id="multiple-pov"
                    checked={multiplePOV}
                    onCheckedChange={setMultiplePOV}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <FormMessage type={message.type} message={message.text} />
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full"
      >
        {isSubmitting ? "Saving..." : "Save Review"}
      </Button>
    </form>
  );
}

