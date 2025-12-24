/* eslint-disable react-hooks/purity */
import { motion } from "framer-motion";
import { Trophy, Share2, TrendingUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { User } from "@/types/user.type";

interface CelebrationWidgetProps {
  user: User;
  onIncreaseGoal?: () => void;
  onShare?: () => void;
  className?: string;
}

export function CelebrationWidget({
  user,
  onIncreaseGoal,
  onShare,
  className,
}: CelebrationWidgetProps) {
  const goal = user.currentGoal!;
  const currentYear = new Date().getFullYear();
  const canIncreaseGoal = goal.year === currentYear;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card
        className={cn(
          "relative overflow-hidden glow-gold border-gold/30 h-[330px] flex flex-col",
          className
        )}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-2 w-2 rounded-full bg-gold/40"
              initial={{
                x: Math.random() * 100 + "%",
                y: "100%",
                opacity: 0,
              }}
              animate={{
                y: "-20%",
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        <CardContent className="relative py-8 text-center flex-1 flex flex-col justify-center">
          {/* Trophy icon with glow */}
          <motion.div
            className="mx-auto mb-4 inline-flex rounded-full gradient-gold p-4"
            animate={{
              boxShadow: [
                "0 0 20px hsl(45 93% 47% / 0.3)",
                "0 0 40px hsl(45 93% 47% / 0.5)",
                "0 0 20px hsl(45 93% 47% / 0.3)",
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="h-8 w-8 text-gold-foreground" />
          </motion.div>

          {/* Celebration text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-1 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              <h3 className="text-xl font-bold text-gold">Goal Achieved!</h3>
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <p className="mb-6 text-muted-foreground">
              {goal.type === "pages"
                ? `You read ${goal.current} pages`
                : goal.type === "genres"
                ? `You read from ${goal.current} genres`
                : goal.type === "consistency"
                ? `You read for ${goal.current} consecutive days`
                : `You read ${goal.current} books`}{" "}
              in {goal.year}!
            </p>
          </motion.div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={onShare}
              variant="outline"
              className="gap-2 border-gold/30 hover:bg-gold/10"
            >
              <Share2 className="h-4 w-4" />
              Share Milestone
            </Button>

            {canIncreaseGoal && (
              <Button
                onClick={onIncreaseGoal}
                className="gap-2 gradient-gold text-gold-foreground hover:opacity-90"
              >
                <TrendingUp className="h-4 w-4" />
                Increase Goal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
