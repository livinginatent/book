"use client";

import { FolderLock, Plus, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { getShelves, createCustomShelf } from "@/app/actions/shelf-actions";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PrivateShelvesProps {
  locked?: boolean;
}

interface ShelfItem {
  id: string;
  name: string;
  type: "default" | "custom";
  bookCount: number;
  status?: string | null;
}

export function PrivateShelves({ locked = false }: PrivateShelvesProps) {
  const [defaultShelves, setDefaultShelves] = useState<ShelfItem[]>([]);
  const [customShelves, setCustomShelves] = useState<ShelfItem[]>([]);
  const [showDefault, setShowDefault] = useState(false);
  const [showCustom, setShowCustom] = useState(true);
  const [newShelfName, setNewShelfName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (locked) {
        if (isMounted) setLoading(false);
        return;
      }

      if (isMounted) setLoading(true);
      const result = await getShelves();
      if (!isMounted) return;

      if (result.success) {
        setDefaultShelves(
          result.defaultShelves.map((shelf) => ({
            id: shelf.id,
            name: shelf.name,
            type: shelf.type,
            bookCount: shelf.book_count,
            status: shelf.status,
          }))
        );
        setCustomShelves(
          result.customShelves.map((shelf) => ({
            id: shelf.id,
            name: shelf.name,
            type: shelf.type,
            bookCount: shelf.book_count,
            status: shelf.status,
          }))
        );
      } else {
        console.error("Failed to load shelves:", result.error);
      }
      if (isMounted) setLoading(false);
    }

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, [locked]);

  // Refresh shelves when books are added/changed elsewhere
  useEffect(() => {
    let isMounted = true;

    const handler = async () => {
      if (!isMounted || locked) return;

      const result = await getShelves();
      if (!isMounted) return;

      if (result.success) {
        setDefaultShelves(
          result.defaultShelves.map((shelf) => ({
            id: shelf.id,
            name: shelf.name,
            type: shelf.type,
            bookCount: shelf.book_count,
            status: shelf.status,
          }))
        );
        setCustomShelves(
          result.customShelves.map((shelf) => ({
            id: shelf.id,
            name: shelf.name,
            type: shelf.type,
            bookCount: shelf.book_count,
            status: shelf.status,
          }))
        );
      } else {
        console.error("Failed to refresh shelves:", result.error);
      }
    };

    window.addEventListener("book-added", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("book-added", handler);
    };
  }, [locked]);

  const handleCreateShelf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;

    startTransition(async () => {
      const result = await createCustomShelf(newShelfName);
      if (result.success) {
        setCustomShelves((prev) => [
          ...prev,
          {
            id: result.shelf.id,
            name: result.shelf.name,
            type: result.shelf.type,
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
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  Default shelves
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on your reading status
                </p>
              </div>
              {showDefault ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
                    // Link "Currently Reading" shelf to the currently reading page
                    const isCurrentlyReading =
                      shelf.status === "currently_reading";
                    const ShelfContent = (
                      <div
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl bg-background transition-colors",
                          isCurrentlyReading
                            ? "hover:bg-muted/70 cursor-pointer"
                            : "hover:bg-muted/70"
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
                        {isCurrentlyReading ? (
                          <Link href="/currently-reading">{ShelfContent}</Link>
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
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">
                  Private shelves
                </p>
                <p className="text-xs text-muted-foreground">
                  Create your own collections
                </p>
              </div>
              {showCustom ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <div
              className={cn(
                "overflow-hidden transition-all duration-200",
                showCustom ? "max-h-64" : "max-h-0"
              )}
            >
              <div className="px-4 pb-3 space-y-2">
                {loading && !hasCustomShelves ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Loading shelves...
                  </p>
                ) : hasCustomShelves ? (
                  customShelves.map((shelf) => (
                    <div
                      key={shelf.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-background hover:bg-muted/70 transition-colors"
                    >
                      <span className="text-sm font-medium">{shelf.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {shelf.bookCount} book
                        {shelf.bookCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2">
                    No private shelves yet. Create your first one below.
                  </p>
                )}

                {/* Create shelf form */}
                <form
                  onSubmit={handleCreateShelf}
                  className="flex items-center gap-2 pt-1"
                >
                  <Input
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                    placeholder="New shelf name"
                    className="h-8 text-sm"
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
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
