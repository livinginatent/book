"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface ComplexityCurveProps {
  data: Array<{
    difficulty: string;
    count: number;
  }>;
}

export function ComplexityCurveCard({ data }: ComplexityCurveProps) {
  return (
    <DashboardCard
      title="Complexity Curve"
      description="Books read by difficulty level"
    >
      <ChartContainer
        config={{
          count: {
            label: "Books",
            color: "hsl(var(--chart-3))",
          },
        }}
        className="h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="difficulty"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              fill="hsl(var(--chart-3))"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </DashboardCard>
  );
}
