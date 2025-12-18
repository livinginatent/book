import { FolderLock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface PrivateShelvesProps {
  locked?: boolean;
}

export function PrivateShelves({ locked = false }: PrivateShelvesProps) {
  const shelves = [
    { name: "Guilty Pleasures", count: 12 },
    { name: "Gift Ideas", count: 8 },
    { name: "Secret TBR", count: 24 },
  ];

  return (
    <DashboardCard
      title="Private Shelves"
      description="Your secret collections"
      icon={FolderLock}
      locked={locked}
      action={
        !locked && (
          <Button variant="ghost" size="sm" className="rounded-xl">
            <Plus className="w-4 h-4" />
          </Button>
        )
      }
    >
      <div className="space-y-2">
        {shelves.map((shelf) => (
          <div
            key={shelf.name}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-medium text-sm">{shelf.name}</span>
            <span className="text-xs text-muted-foreground">
              {shelf.count} books
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
