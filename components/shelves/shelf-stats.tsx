import { DashboardCard } from "@/components/ui/dashboard-card";
import { Zap, TrendingUp, BarChart3 } from "lucide-react";

interface Book {
  pagesRead: number;
  totalPages: number;
}

interface ShelfStatsProps {
  books: Book[];
  totalPagesLeft?: number;
}

export function ShelfStats({ books, totalPagesLeft = 0 }: ShelfStatsProps) {
  const totalPages = books.reduce((sum, book) => sum + book.totalPages, 0);
  const totalPagesRead = books.reduce((sum, book) => sum + book.pagesRead, 0);
  const avgProgress =
    books.length > 0 ? Math.round((totalPagesRead / totalPages) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-4">
      <DashboardCard title="Total progress" className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total progress</p>
            <p className="text-2xl font-bold text-foreground">{avgProgress}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPagesRead.toLocaleString()} / {totalPages.toLocaleString()}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Books in progress" className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Books in progress
            </p>
            <p className="text-2xl font-bold text-foreground">{books.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active reads</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard title="Total pages to read" className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Pages left</p>
            <p className="text-2xl font-bold text-foreground">
              {totalPagesLeft.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Remaining pages
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
