"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteUserAccount } from "@/app/actions/settings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPaidUser?: boolean;
}

const CONFIRMATION_TEXT = "DELETE";

export function DeleteAccountModal({
  open,
  onOpenChange,
  isPaidUser = false,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationText === CONFIRMATION_TEXT;

  async function handleDelete() {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteUserAccount();

      if (!result.success) {
        setIsDeleting(false);
        setError(result.error);
      } else {
        // Client-side redirect to avoid NEXT_REDIRECT error
        router.push(result.redirectTo);
        router.refresh();
      }
    } catch (err) {
      // Catch NEXT_REDIRECT errors - Next.js redirect() throws a special error
      setIsDeleting(false);
      const error = err as Error & { digest?: string };
      if (error?.digest === "NEXT_REDIRECT") {
        // Redirect was successful, just navigate client-side
        router.push("/");
        router.refresh();
      } else {
        setError(error?.message || "An unexpected error occurred");
      }
    }
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset state when closing
        setConfirmationText("");
        setError(null);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-destructive">
              Delete Account
            </DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            This action cannot be undone. This will permanently delete your
            account, all your reading data, books, goals, and sessions.
            {isPaidUser && (
              <span className="block mt-2 font-semibold text-destructive">
                Note: If you have an active subscription, no refunds will be
                issued for the current billing period.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-semibold">DELETE</span> to
              confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={CONFIRMATION_TEXT}
              disabled={isDeleting}
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

