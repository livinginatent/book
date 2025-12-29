"use client";

import {
  Zap,
  TrendingUp,
  BarChart3,
  BookOpen,
  Target,
  Star,
  Tag,
  Clock,
  Pause,
  BookMarked,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface Book {
  pagesRead: number;
  totalPages: number;
  rating?: number | null;
  subjects?: string[] | null;
  notes?: string | null;
}

interface ShelfStatsProps {
  books: Book[];
  totalPagesLeft?: number;
  variant?: "currently-reading" | "want-to-read" | "read" | "dnf" | "paused";
  totalPagesSaved?: number;
  reasonDistribution?: [string, number][];
  averagePauseDuration?: number;
  totalPagesInLimbo?: number;
}

export function ShelfStats({
  books,
  totalPagesLeft = 0,
  variant = "currently-reading",
  totalPagesSaved = 0,
  reasonDistribution = [],
  averagePauseDuration = 0,
  totalPagesInLimbo = 0,
}: ShelfStatsProps) {
  const totalPages = books.reduce((sum, book) => sum + book.totalPages, 0);
  const totalPagesRead = books.reduce((sum, book) => sum + book.pagesRead, 0);
  const avgProgress =
    books.length > 0 ? Math.round((totalPagesRead / totalPages) * 100) : 0;

  if (variant === "dnf") {
    // Default reasons we offer
    const defaultReasons = [
      "Too Slow",
      "Writing Style",
      "Lost Interest",
      "Too Complex",
      "Characters",
      "Plot Issues",
    ];

    // Group reasons: default reasons vs personal reasons
    const chartData: { reason: string; count: number }[] = [];
    const defaultReasonMap = new Map<string, number>();
    let personalReasonCount = 0;

    reasonDistribution.forEach(([reason, count]) => {
      if (defaultReasons.includes(reason)) {
        defaultReasonMap.set(reason, count);
      } else {
        personalReasonCount += count;
      }
    });

    // Add default reasons in order
    defaultReasons.forEach((reason) => {
      const count = defaultReasonMap.get(reason) || 0;
      if (count > 0) {
        chartData.push({ reason, count });
      }
    });

    // Add personal reasons if any
    if (personalReasonCount > 0) {
      chartData.push({ reason: "Personal Reason", count: personalReasonCount });
    }

    const chartConfig: ChartConfig = {
      count: {
        label: "Books",
        color: "hsl(var(--chart-1))",
      },
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DashboardCard title="Total Pages Saved" className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Pages Saved
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {totalPagesSaved.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pages reclaimed
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Total Books" className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Total Books
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {books.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Did not finish
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
          </DashboardCard>
        </div>

        {chartData.length > 0 && (
          <DashboardCard title="Reason Distribution" className="p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Most Common Reasons
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="reason"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <YAxis
                    dataKey="count"
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    className="text-xs"
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </DashboardCard>
        )}
      </div>
    );
  }

  if (variant === "read") {
    // Calculate average rating
    const booksWithRatings = books.filter(
      (book) => book.rating && book.rating > 0
    );
    const totalRating = booksWithRatings.reduce(
      (sum, book) => sum + (book.rating || 0),
      0
    );
    const avgRating =
      booksWithRatings.length > 0
        ? (totalRating / booksWithRatings.length).toFixed(1)
        : "N/A";

    // Calculate most read genre
    const genreCounts: Record<string, number> = {};
    books.forEach((book) => {
      if (book.subjects && book.subjects.length > 0) {
        book.subjects.forEach((subject) => {
          genreCounts[subject] = (genreCounts[subject] || 0) + 1;
        });
      }
    });
    const mostReadGenre =
      Object.keys(genreCounts).length > 0
        ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
        : "N/A";

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title="Total Books Read" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Total Books Read
              </p>
              <p className="text-2xl font-bold text-foreground">
                {books.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Average Rating" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Average Rating
              </p>
              <p className="text-2xl font-bold text-foreground">{avgRating}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {booksWithRatings.length > 0
                  ? `from ${booksWithRatings.length} rated`
                  : "No ratings yet"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Most Read Genre" className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs text-muted-foreground mb-1">
                Most Read Genre
              </p>
              <p className="text-2xl font-bold text-foreground truncate">
                {mostReadGenre}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {mostReadGenre !== "N/A"
                  ? `${genreCounts[mostReadGenre]} books`
                  : "No genres"}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>
      </div>
    );
  }

  if (variant === "paused") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Average Pause Duration" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Average Pause Duration
              </p>
              <p className="text-2xl font-bold text-foreground">
                {averagePauseDuration > 0 ? `${averagePauseDuration} days` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Time on hold
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Pause className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Total Pages in Limbo" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Total Pages in Limbo
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalPagesInLimbo.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Unread pages
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookMarked className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>
      </div>
    );
  }

  if (variant === "want-to-read") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DashboardCard title="Total Books" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Books</p>
              <p className="text-2xl font-bold text-foreground">
                {books.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                In your queue
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Total Pages to Conquer" className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Total Pages to Conquer
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalPagesLeft.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Pages waiting
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
