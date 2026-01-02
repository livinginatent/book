"use client";

import { Info } from "lucide-react";
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

interface ComplexityCurveProps {
  data: Array<{
    difficulty: string;
    count: number;
  }>;
}

export function ComplexityCurveCard({ data }: ComplexityCurveProps) {
  const infoTooltip = (
    <Popover>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Info className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="left" className="max-w-xs">
        <p className="text-xs">
          Your complexity curve shows the distribution of books you've read
          across different difficulty levels. This helps you understand whether
          you gravitate toward lighter reads, challenging texts, or maintain a
          balanced reading diet.
        </p>
      </PopoverContent>
    </Popover>
  );

  if (data.length === 0) {
    return (
      <DashboardCard
        title="Complexity Curve"
        description="Books read by difficulty level"
        action={infoTooltip}
      >
        <div className="h-72 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No complexity data available</p>
        </div>
      </DashboardCard>
    );
  }

  // Find max count for domain
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <DashboardCard
      title="Complexity Curve"
      description="Books read by difficulty level"
      action={infoTooltip}
    >
      <>
        {/* Mobile: Horizontal Bar Chart */}
        <div className="md:hidden w-full overflow-hidden">
          <ChartContainer
            config={{
              count: {
                label: "Books",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-72 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
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
                  dataKey="difficulty"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                  width={42}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--chart-3))"
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
            count: {
              label: "Books",
              color: "hsl(var(--chart-3))",
            },
          }}
          className="hidden md:block h-72"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="10%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
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
                barSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </>
    </DashboardCard>
  );
}
