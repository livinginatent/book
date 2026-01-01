"use client";

import { Radar } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { DashboardCard } from "@/components/ui/dashboard-card";

interface DNARadarProps {
  structuralFlags: Array<{
    key: string;
    percentage: number;
  }>;
}

const flagLabels: Record<string, string> = {
  plot_driven: "Plot-Driven",
  character_driven: "Character-Driven",
  fast_paced: "Fast-Paced",
  slow_burn: "Slow Burn",
  multiple_pov: "Multiple POV",
  world_building: "World Building",
  plot_twists: "Plot Twists",
  diverse_cast: "Diverse Cast",
};

export function DNARadar({ structuralFlags }: DNARadarProps) {
  // Take top 6 flags for radar chart
  const topFlags = structuralFlags.slice(0, 6);

  const chartData = topFlags.map((flag) => ({
    attribute: flagLabels[flag.key] || flag.key.replace(/_/g, " "),
    value: Math.round(flag.percentage),
  }));

  if (chartData.length === 0) {
    return (
      <DashboardCard
        title="Reading DNA Radar"
        description="Your reading preferences profile"
        icon={Radar}
        className="col-span-full"
      >
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No preference data available</p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Reading DNA Radar"
      description="Your reading preferences profile"
      icon={Radar}
      className="col-span-full"
    >
      <ChartContainer
        config={{
          value: {
            label: "Preference %",
            color: "hsl(var(--chart-3))",
          },
        }}
        className="h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="attribute"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <RechartsRadar
              name="Preference"
              dataKey="value"
              stroke="hsl(var(--chart-3))"
              fill="hsl(var(--chart-3))"
              fillOpacity={0.6}
            />
            <Tooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </DashboardCard>
  );
}
