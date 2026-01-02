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
  character_development: "Character Dev",
  multiple_pov: "Multiple POV",
  world_building: "World Building",
  twist_ending: "Twist Ending",
  diverse_cast: "Diverse Cast",
  strong_prose: "Strong Prose",
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
        <div className="h-64 md:h-72 flex items-center justify-center text-muted-foreground">
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
      <div className="w-full overflow-hidden">
        <ChartContainer
          config={{
            value: {
              label: "Preference %",
              color: "hsl(var(--chart-3))",
            },
          }}
          className="h-64 md:h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                bottom: 10,
                left: 10,
              }}
            >
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="attribute"
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
                className="md:text-xs"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 9,
                }}
                className="md:text-xs"
              />
              <RechartsRadar
                name="Preference"
                dataKey="value"
                stroke="hsl(var(--chart-3))"
                fill="hsl(var(--chart-3))"
                fillOpacity={0.6}
                strokeWidth={1.5}
              />
              <Tooltip content={<ChartTooltipContent />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </DashboardCard>
  );
}
