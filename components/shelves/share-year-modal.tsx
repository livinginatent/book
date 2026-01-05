"use client";

import { Share2, Copy, Check, BookOpen, Star } from "lucide-react";
import { useState, useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ShareYearModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  bookCount: number;
  averageRating?: string | number;
  onGenerateShareText?: () => string;
}

export function ShareYearModal({
  open,
  onOpenChange,
  year,
  bookCount,
  averageRating,
  onGenerateShareText,
}: ShareYearModalProps) {
  const [shareText, setShareText] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate share text when modal opens
  useEffect(() => {
    if (open) {
      if (onGenerateShareText) {
        setShareText(onGenerateShareText());
      } else {
        const avgRatingText =
          averageRating && averageRating !== "N/A"
            ? `⭐ Average rating: ${averageRating}\n`
            : "";
        const generatedText =
          `📚 My ${year} Reading Year 📚\n\n` +
          `📖 ${bookCount} ${bookCount === 1 ? "book" : "books"} read\n` +
          (avgRatingText ? avgRatingText + "\n" : "") +
          `What was your reading year like?`;
        setShareText(generatedText);
      }
    }
  }, [open, onGenerateShareText, year, bookCount, averageRating]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setShareText("");
      setCopied(false);
    }
  }, [open]);

  async function handleShare() {
    if (!shareText) return;

    // Try to share using Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My ${year} Reading Year`,
          text: shareText,
        });
        onOpenChange(false);
      } catch (err) {
        // User cancelled or error occurred, fallback to clipboard
        if ((err as Error).name !== "AbortError") {
          await handleCopy();
        }
      }
    } else {
      // Fallback to clipboard
      await handleCopy();
    }
  }

  async function handleCopy() {
    if (!shareText) return;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Share My {year} Reading Year</DialogTitle>
          </div>
          <DialogDescription>
            Share your reading achievements with friends and family!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats Preview */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{bookCount}</span>
              <span className="text-muted-foreground">
                {bookCount === 1 ? "book" : "books"} read in {year}
              </span>
            </div>
            {averageRating && averageRating !== "N/A" && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-muted-foreground fill-yellow-500 text-yellow-500" />
                <span className="font-medium">Average rating:</span>
                <span className="text-muted-foreground">{averageRating}/5</span>
              </div>
            )}
          </div>

          {/* Share Text Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share text:</label>
            <Textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              className="min-h-[120px] resize-none font-mono text-sm"
              placeholder="Your reading year summary..."
            />
            <p className="text-xs text-muted-foreground">
              You can edit this text before sharing.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 sm:flex-none"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
            <Button onClick={handleShare} className="flex-1 sm:flex-none">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

