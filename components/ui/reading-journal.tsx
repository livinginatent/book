"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  PenLine,
  Quote,
  Lightbulb,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type JournalEntryType = "note" | "quote" | "prediction";

export interface JournalEntry {
  id: string;
  type: JournalEntryType;
  content: string;
  page?: number;
  createdAt: Date;
}

interface ReadingJournalProps {
  entries: JournalEntry[];
  onAddEntry?: (type: JournalEntryType, content: string, page?: number) => void;
  className?: string;
}

const entryTypeConfig = {
  note: {
    icon: PenLine,
    label: "Note",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  quote: {
    icon: Quote,
    label: "Quote",
    color: "bg-accent/10 text-accent border-accent/20",
  },
  prediction: {
    icon: Lightbulb,
    label: "Prediction",
    color: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  },
};

export function ReadingJournal({
  entries,
  onAddEntry,
  className,
}: ReadingJournalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntryType, setNewEntryType] = useState<JournalEntryType>("note");
  const [newContent, setNewContent] = useState("");
  const [newPage, setNewPage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = () => {
    if (newContent.trim()) {
      onAddEntry?.(
        newEntryType,
        newContent,
        newPage ? Number.parseInt(newPage) : undefined
      );
      setNewContent("");
      setNewPage("");
      setIsAdding(false);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          {entries.length} entries
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="text-primary hover:text-primary hover:bg-primary/10"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {isAdding && (
        <div className="mb-4 p-4 rounded-xl bg-muted/50 border border-border animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-2 mb-3">
            {(Object.keys(entryTypeConfig) as JournalEntryType[]).map(
              (type) => {
                const config = entryTypeConfig[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewEntryType(type)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      newEntryType === type
                        ? config.color
                        : "bg-background text-muted-foreground border-border hover:border-primary/30"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              }
            )}
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={
              newEntryType === "quote"
                ? "Enter a quote from the book..."
                : newEntryType === "prediction"
                ? "What do you think will happen next?"
                : "Write your thoughts..."
            }
            className="w-full p-3 rounded-lg bg-background border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={3}
          />
          <div className="flex items-center justify-between mt-3">
            <input
              type="number"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              placeholder="Page #"
              className="w-20 px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!newContent.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {entries.map((entry) => {
            const config = entryTypeConfig[entry.type];
            const Icon = config.icon;
            return (
              <div
                key={entry.id}
                className={cn(
                  "p-3 rounded-xl border-l-4 bg-card",
                  entry.type === "note" && "border-l-primary",
                  entry.type === "quote" && "border-l-accent",
                  entry.type === "prediction" && "border-l-chart-4"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className={cn("w-3.5 h-3.5", config.color.split(" ")[1])}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {config.label}
                  </span>
                  {entry.page && (
                    <span className="text-xs text-muted-foreground">
                      • p.{entry.page}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm text-foreground",
                    entry.type === "quote" && "italic"
                  )}
                >
                  {entry.type === "quote"
                    ? `"${entry.content}"`
                    : entry.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
