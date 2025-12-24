import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number;
  paceValue?: number;
  className?: string;
  showPace?: boolean;
}

export function AnimatedProgress({
  value,
  paceValue,
  className,
  showPace = true,
}: AnimatedProgressProps) {
  return (
    <div
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      {/* Pace indicator (ghost bar) */}
      {showPace && paceValue !== undefined && (
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/20"
          initial={{ width: 0 }}
          animate={{ width: `${paceValue}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        />
      )}

      {/* Actual progress bar */}
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full gradient-progress"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{
          duration: 1,
          ease: [0.25, 0.46, 0.45, 0.94],
          delay: 0.1,
        }}
      />

      {/* Shine effect */}
      <motion.div
        className="absolute inset-y-0 left-0 w-full"
        initial={{ x: "-100%", opacity: 0 }}
        animate={{ x: "100%", opacity: [0, 0.5, 0] }}
        transition={{
          duration: 1.5,
          delay: 1,
          ease: "easeInOut",
        }}
      >
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent" />
      </motion.div>
    </div>
  );
}
