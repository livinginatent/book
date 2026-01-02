"use client";

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
import { DashboardCard } from "@/components/ui/dashboard-card";

interface GenreLandscapeProps {
  subjects: Array<{
    name: string;
    count: number;
    avgRating: number;
  }>;
}

export function GenreLandscapeCard({ subjects }: GenreLandscapeProps) {
  // Find max count for domain
  const maxCount = Math.max(...subjects.map((s) => s.count), 1);

  const chartData = subjects.map((subject) => ({
    genre: subject.name,
    books: subject.count,
    rating: subject.avgRating,
  }));

  if (subjects.length === 0) {
    return (
      <DashboardCard
        title="Genre Landscape"
        description="Your top reading genres"
        icon={BookOpen}
        className="col-span-full lg:col-span-2"
      >
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No genre data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Genre Landscape"
      description="Your top reading genres"
      icon={BookOpen}
      className="col-span-full lg:col-span-2"
    >
      <>
        {/* Mobile: Horizontal Bar Chart */}
        <div className="md:hidden w-full overflow-hidden">
          <ChartContainer
            config={{
              books: {
                label: "Books",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-72 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                barCategoryGap="8%"
                margin={{ left: 45, right: 5, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  domain={[0, maxCount]}
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                  width={25}
                />
                <YAxis
                  type="category"
                  dataKey="genre"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                  width={42}
                />
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
                  radius={[0, 8, 8, 0]}
                  barSize={22}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Desktop: Vertical Bar Chart */}
        <ChartContainer
          config={{
            books: {
              label: "Books",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="hidden md:block h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="10%">
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
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </>
    </DashboardCard>
  );
}

