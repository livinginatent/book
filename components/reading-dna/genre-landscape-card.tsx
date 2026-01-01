"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { BookOpen } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface GenreLandscapeProps {
  subjects: Array<{
    name: string;
    count: number;
    avgRating: number;
  }>;
}

export function GenreLandscapeCard({ subjects }: GenreLandscapeProps) {
  const chartData = subjects.map((subject) => ({
    genre: subject.name.length > 15
      ? `${subject.name.substring(0, 15)}...`
      : subject.name,
    books: subject.count,
    rating: subject.avgRating,
  }));

  return (
    <DashboardCard
      title="Genre Landscape"
      description="Your top reading genres"
      icon={BookOpen}
      className="col-span-full lg:col-span-2"
    >
      {subjects.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No genre data available</p>
        </div>
      ) : (
        <ChartContainer
          config={{
            books: {
              label: "Books",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="genre"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                content={<ChartTooltipContent />}
                formatter={(value: number, name: string) => {
                  if (name === "books") {
                    return [`${value} books`, "Count"];
                  }
                  return [value, name];
                }}
              />
              <Bar
                dataKey="books"
                fill="hsl(var(--chart-1))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </DashboardCard>
  );
}

