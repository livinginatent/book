import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReadingGoal } from "@/types/user.type";

interface UpdateProgressDialogProps {
  goal: ReadingGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProgress: (newCurrent: number) => void;
}

export function UpdateProgressDialog({
  goal,
  open,
  onOpenChange,
  onUpdateProgress,
}: UpdateProgressDialogProps) {
  const [value, setValue] = useState(goal.current);
  const unit = goal.type === "pages" ? "pages" : "books";

  const handleIncrement = () => setValue((v) => v + 1);
  const handleDecrement = () => setValue((v) => Math.max(0, v - 1));

  const handleSave = () => {
    onUpdateProgress(value);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Progress</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Current {unit} read</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrement}
                disabled={value <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                className="text-center text-2xl font-bold"
                min={0}
              />

              <Button variant="outline" size="icon" onClick={handleIncrement}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Visual feedback */}
          <div className="rounded-lg bg-secondary/50 p-4 text-center">
            <motion.span
              key={value}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-primary"
            >
              {value}
            </motion.span>
            <span className="text-muted-foreground">
              {" "}
              / {goal.target} {unit}
            </span>
          </div>

          <Button onClick={handleSave} className="w-full">
            Save Progress
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
