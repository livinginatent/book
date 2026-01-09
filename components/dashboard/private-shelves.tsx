"use client";

import { FolderLock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { ShelfData } from "@/app/actions/dashboard-data";
import { refreshShelves } from "@/app/actions/dashboard-data";
import { createCustomShelf } from "@/app/actions/shelf-actions";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Input } from "@/components/ui/input";
import { useShelfLoading } from "@/hooks/use-shelf-loading";
import { cn, slugify } from "@/lib/utils";

interface PrivateShelvesProps {
  locked?: boolean;
  subscriptionTier?: "free" | "premium" | "bibliophile" | null;
  totalCustomShelves?: number;
  initialShelves?: {
    default: ShelfData[];
    custom: ShelfData[];
  };
}

export function PrivateShelves({
  locked = false,
  subscriptionTier,
  totalCustomShelves,
  initialShelves,
}: PrivateShelvesProps) {
  const { withLoading } = useShelfLoading();

  // Initialize from server data if available
  const [defaultShelves, setDefaultShelves] = useState<ShelfData[]>(
    () => initialShelves?.default || []
  );
  const [customShelves, setCustomShelves] = useState<ShelfData[]>(
    () => initialShelves?.custom || []
  );
  const [showDefault, setShowDefault] = useState(false);
  const [showCustom, setShowCustom] = useState(true);
  const [newShelfName, setNewShelfName] = useState("");
  const [isPending, startTransition] = useTransition();

  // Only show loading if we don't have initial data
  const [loading, setLoading] = useState(!initialShelves && !locked);

  // Fetch data only if we don't have initial data
  useEffect(() => {
    if (locked || initialShelves) {
      return;
    }

    let isMounted = true;

    async function fetchShelves() {
      const result = await refreshShelves();
      if (!isMounted) return;

      if (result.success && result.shelves) {
        setDefaultShelves(result.shelves.default);
        setCustomShelves(result.shelves.custom);
      }
      setLoading(false);
    }

    fetchShelves();

    return () => {
      isMounted = false;
    };
  }, [locked, initialShelves]);

  // Refresh shelves when books are added/changed
  useEffect(() => {
    if (locked) return;

    let isMounted = true;

    const handler = async () => {
      if (!isMounted) return;

      const result = await refreshShelves();
      if (!isMounted) return;

      if (result.success && result.shelves) {
        setDefaultShelves(result.shelves.default);
        setCustomShelves(result.shelves.custom);
      }
    };

    window.addEventListener("book-added", handler);
    window.addEventListener("book-status-changed", handler);

    return () => {
      isMounted = false;
      window.removeEventListener("book-added", handler);
      window.removeEventListener("book-status-changed", handler);
    };
  }, [locked]);

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;

    startTransition(async () => {
      const result = await withLoading(
        () => createCustomShelf(newShelfName),
        "Creating shelf..."
      );
      if (result.success) {
        setCustomShelves((prev) => [
          ...prev,
          {
            id: result.shelf.id,
            name: result.shelf.name,
            type: result.shelf.type as "default" | "custom",
            bookCount: result.shelf.book_count,
          },
        ]);
        setNewShelfName("");
        setShowCustom(true);
      } else {
        console.error("Failed to create shelf:", result.error);
      }
    });
  };

  const hasCustomShelves = customShelves.length > 0;

  const effectiveCustomCount = totalCustomShelves ?? customShelves.length;
  const isFreeTier = subscriptionTier === "free" || !subscriptionTier;
  const freeTierLimit = 4;
  const isAtFreeLimit = isFreeTier && effectiveCustomCount >= freeTierLimit;
  const isOverFreeLimit = isFreeTier && effectiveCustomCount > freeTierLimit;

  // Calculate total book counts
  const totalDefaultBooks = defaultShelves.reduce(
    (sum, shelf) => sum + shelf.bookCount,
    0
  );
  const totalCustomBooks = customShelves.reduce(
    (sum, shelf) => sum + shelf.bookCount,
    0
  );

  // Map reading status to shelf routes
  const statusToRoute: Record<string, string> = {
    currently_reading: "/shelves/currently-reading",
    want_to_read: "/shelves/want-to-read",
    finished: "/shelves/finished",
    dnf: "/shelves/did-not-finish",
    up_next: "/shelves/up-next",
    paused: "/shelves/paused",
  };

  const getShelfHref = (
    status: string | null | undefined
  ): string | undefined => {
    if (!status) return undefined;
    return statusToRoute[status];
  };

  return (
    <DashboardCard
      title="Shelves"
      description="Default and private collections"
      icon={FolderLock}
      locked={locked}
    >
      {!locked && (
        <div className="space-y-4">
          {/* Default shelves */}
          <div className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDefault((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition-colors"
            >
              <div className="text-left flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Default shelves
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {totalDefaultBooks} book{totalDefaultBooks === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on your reading status
                </p>
              </div>
              {showDefault ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
              )}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                showDefault ? "max-h-96" : "max-h-0"
              )}
            >
              <div className="px-4 pb-3 space-y-2">
                {loading && defaultShelves.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Loading shelves...
                  </p>
                ) : (
                  defaultShelves.map((shelf) => {
                    const shelfHref = getShelfHref(shelf.status);
                    const isLinkable = !!shelfHref;

                    const ShelfContent = (
                      <div
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors",
                          isLinkable && "cursor-pointer"
                        )}
                      >
                        <span className="text-sm font-medium">
                          {shelf.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {shelf.bookCount} book
                          {shelf.bookCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    );

                    return (
                      <div key={shelf.id}>
                        {isLinkable ? (
                          <Link href={shelfHref}>{ShelfContent}</Link>
                        ) : (
                          ShelfContent
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Custom shelves */}
          <div className="rounded-2xl bg-muted/40 border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustom((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/60 transition-colors"
            >
              <div className="text-left flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Private shelves
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {totalCustomBooks} book{totalCustomBooks === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create your own collections
                </p>
              </div>
              {showCustom ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
              )}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                showCustom ? "max-h-64" : "max-h-0"
              )}
            >
              <div className="px-4 pb-3 space-y-2">
                {isOverFreeLimit && (
                  <div className="mb-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-xs text-amber-900 dark:text-amber-200">
                      You have exceeded the free shelf limit. Your existing
                      shelves are safe, but creation is disabled.
                    </p>
                  </div>
                )}
                {loading && !hasCustomShelves ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Loading shelves...
                  </p>
                ) : hasCustomShelves ? (
                  customShelves.map((shelf) => {
                    const shelfSlug = slugify(shelf.name);
                    const shelfHref = `/shelves/${shelfSlug}`;

                    return (
                      <Link
                        key={shelf.id}
                        href={shelfHref}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <span className="text-sm font-medium">
                          {shelf.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {shelf.bookCount} book
                          {shelf.bookCount === 1 ? "" : "s"}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No private shelves yet. Create your first one below.
                  </p>
                )}

                {/* Create shelf form / limit message */}
                {isAtFreeLimit ? (
                  <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                    <span>
                      Free tier limit reached (3/3).{" "}
                      <Link
                        href="/checkout"
                        className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700 dark:text-amber-200 dark:hover:text-amber-100"
                      >
                        Upgrade to unlock more
                      </Link>
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleCreateShelf}
                    className="flex items-center gap-2 pt-1"
                  >
                    <Input
                      value={newShelfName}
                      onChange={(e) => setNewShelfName(e.target.value)}
                      placeholder="New shelf name"
                      className="h-8 bg-muted/50 hover:bg-muted transition-colors text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-xl"
                      disabled={isPending || !newShelfName.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
