"use client";

import { Gauge, Info } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DashboardCard } from "@/components/ui/dashboard-card";

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

  const infoTooltip = (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Info className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="max-w-xs">
        <p className="text-xs">
          This chart reveals how book pacing influences your ratings. Compare
          average ratings across different pacing styles to discover which
          narrative tempo resonates most with your reading preferences.
        </p>
      </PopoverContent>
    </Popover>
  );

  return (
    <DashboardCard
      title="Pacing Satisfaction"
      description="How pacing affects your ratings"
      icon={Gauge}
      action={infoTooltip}
    >
      {pacingStats.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No pacing data available</p>
        </div>
      ) : (
        <>
          {/* Mobile: Horizontal Bar Chart */}
          <div className="md:hidden w-full overflow-hidden">
            <ChartContainer
              config={{
                rating: {
                  label: "Avg Rating",
                  color: "hsl(var(--chart-2))",
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
                    domain={[0, 5]}
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                    width={25}
                  />
                  <YAxis
                    type="category"
                    dataKey="pacing"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="rating"
                    fill="hsl(var(--chart-2))"
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
              rating: {
                label: "Avg Rating",
                color: "hsl(var(--chart-2))",
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
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </>
      )}
    </DashboardCard>
  );
}
