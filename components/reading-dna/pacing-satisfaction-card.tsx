"use client";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { Gauge } from "lucide-react";
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

interface PacingSatisfactionProps {
  pacingStats: Array<{
    label: string;
    avgRating: number;
  }>;
}

export function PacingSatisfactionCard({
  pacingStats,
}: PacingSatisfactionProps) {
  const chartData = pacingStats.map((stat) => ({
    pacing: stat.label,
    rating: stat.avgRating,
  }));

  return (
    <DashboardCard
      title="Pacing Satisfaction"
      description="How pacing affects your ratings"
      icon={Gauge}
      className="col-span-full lg:col-span-2"
    >
      {pacingStats.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No pacing data available</p>
        </div>
      ) : (
        <ChartContainer
          config={{
            rating: {
              label: "Avg Rating",
              color: "hsl(var(--chart-2))",
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
                dataKey="pacing"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="rating"
                fill="hsl(var(--chart-2))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      )}
    </DashboardCard>
  );
}

