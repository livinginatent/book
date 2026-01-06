"use client";

import {
  Download,
  Trash2,
  Upload,
  Clock,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { exportUserLibrary, resetLibrary } from "@/app/actions/settings";
import { GoodreadsImport } from "@/components/import/goodreads-import";
import { SettingsContent } from "@/components/settings/settings-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ImportHistoryEntry {
  id: string;
  source: "goodreads";
  fileName: string;
  imported: number;
  failed: number;
  totalSelected?: number;
  createdAt: string;
}

export default function DataMigrationPage() {
  const [showGoodreadsImport, setShowGoodreadsImport] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryEntry[]>([]);

  useEffect(() => {
    function loadHistory() {
      try {
        const raw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("booktab_import_history")
            : null;
        if (!raw) {
          setImportHistory([]);
          return;
        }
        const parsed = JSON.parse(raw) as ImportHistoryEntry[];
        setImportHistory(Array.isArray(parsed) ? parsed : []);
      } catch {
        setImportHistory([]);
      }
    }

    loadHistory();

    function handleUpdated() {
      loadHistory();
    }

    window.addEventListener("import-history-updated", handleUpdated);
    return () =>
      window.removeEventListener("import-history-updated", handleUpdated);
  }, []);

  return (
    <SettingsContent
      title="Data & Migration"
      description="Control your data portability and library history."
    >
      <div className="space-y-6">
        {/* Import Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Import Library
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Goodreads Card */}
            <Card className="border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Upload className="size-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Import from Goodreads
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Upload your CSV export
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full gap-2 bg-primary hover:bg-primary/90"
                  onClick={() => setShowGoodreadsImport(true)}
                >
                  <Upload className="size-4" />
                  Start Import
                </Button>
              </CardContent>
            </Card>

            {/* StoryGraph Card */}
            <Card className="border border-border bg-muted opacity-60">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-lg bg-background flex items-center justify-center">
                      <Upload className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-muted-foreground">
                        Import from StoryGraph
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Upload your CSV export
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-muted text-foreground/80"
                  >
                    Coming Soon
                  </Badge>
                </div>
                <Button disabled className="w-full gap-2 opacity-50">
                  <Upload className="size-4" />
                  Select CSV
                </Button>
              </CardContent>
            </Card>
          </div>

          {showGoodreadsImport && (
            <div className="mt-4">
              <GoodreadsImport
                onImportComplete={(imported) => {
                  if (imported > 0) {
                    window.dispatchEvent(new CustomEvent("profile-refresh"));
                  }
                  setShowGoodreadsImport(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Import History */}
        {importHistory.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Import History
            </h3>
            <Card className="border border-border bg-muted">
              <CardContent className="pt-6 space-y-3">
                {importHistory.map((item) => {
                  const dateLabel = (() => {
                    const date = new Date(item.createdAt);
                    if (Number.isNaN(date.getTime())) return "";
                    return date.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });
                  })();

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 pb-3 last:pb-0 border-b border-border/60 last:border-0"
                    >
                      <div className="size-10 rounded-lg bg-background flex items-center justify-center">
                        <BookOpen className="size-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" />
                          {dateLabel && `${dateLabel} • `}
                          {item.imported} books imported
                          {item.failed > 0 && ` • ${item.failed} failed`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Export Library
          </h3>
          <ExportLibraryCard />
        </div>

        {/* Danger Zone */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive">
            Danger Zone
          </h3>
          <ResetLibraryCard />
        </div>
      </div>
    </SettingsContent>
  );
}

function ExportLibraryCard() {
  const [isExporting, startExport] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExportClick() {
    startExport(async () => {
      setError(null);
      const result = await exportUserLibrary();

      if (!result.success) {
        setError(result.error);
        return;
      }

      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Card className="border border-border bg-muted">
      <CardContent className="pt-6 space-y-4">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-foreground">Export Library</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Download your entire reading history, ratings, and core book details
            as a CSV file.
          </p>
        </div>
        <Button
          onClick={handleExportClick}
          disabled={isExporting}
          className="w-full gap-2"
        >
          <Download className="size-4" />
          {isExporting ? "Preparing Download..." : "Download CSV"}
        </Button>
        {error && (
          <p className="text-xs text-destructive" role="status">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const RESET_CONFIRM_TEXT = "RESET";

function ResetLibraryCard() {
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isConfirmed = confirmationText === RESET_CONFIRM_TEXT;

  function handleCardClick() {
    if (!isResetting) {
      setOpen(true);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isResetting) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmationText("");
      setError(null);
    }
  }

  async function handleConfirmReset() {
    if (!isConfirmed || isResetting) return;

    setIsResetting(true);
    setError(null);
    setSuccess(null);

    const result = await resetLibrary();

    setIsResetting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(result.message);
    setOpen(false);
    setConfirmationText("");

    try {
      window.localStorage.removeItem("booktab_import_history");
      window.dispatchEvent(new CustomEvent("import-history-updated"));
    } catch {
      // ignore localStorage errors
    }

    window.dispatchEvent(new CustomEvent("library-reset"));
  }

  return (
    <>
      <Card className="border border-destructive/40 bg-destructive/10">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h4 className="font-semibold text-foreground">Reset Library</h4>
            <p className="text-sm text-muted-foreground mt-1">
              This will delete all books and logs but keep your profile and
              goals. This action cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleCardClick}
            disabled={isResetting}
          >
            <Trash2 className="size-4" />
            Wipe Library
          </Button>
          {error && (
            <p className="text-xs text-destructive" role="status">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-foreground" role="status">
              {success}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isResetting}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle className="text-destructive">
                Reset Library
              </DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2">
              This will delete all books, reading sessions, and logs from your
              account. Your profile and reading goals will be kept.
              <span className="block mt-2 font-semibold text-destructive">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-confirmation">
                Type{" "}
                <span className="font-mono font-semibold">
                  {RESET_CONFIRM_TEXT}
                </span>{" "}
                to confirm:
              </Label>
              <Input
                id="reset-confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={RESET_CONFIRM_TEXT}
                disabled={isResetting}
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={!isConfirmed || isResetting}
            >
              {isResetting ? "Wiping..." : "Delete All Books"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
