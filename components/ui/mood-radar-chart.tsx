"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface MoodRadarChartProps {
  data?: Array<{
    mood: string;
    value: number;
  }>;
  themeColor?: string;
}

export function MoodRadarChart({
  data = [
    { mood: "Adventurous", value: 85 },
    { mood: "Cozy", value: 72 },
    { mood: "Thoughtful", value: 90 },
    { mood: "Escapist", value: 78 },
  ],
  themeColor,
}: MoodRadarChartProps) {
  // Use emerald-500 (#10b981) if themeColor is "emerald-500", otherwise use accent
  const fillColor =
    themeColor === "emerald-500" ? "#10b981" : "var(--color-accent)";

  return (
    <div className="w-full h-40 -mx-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid strokeOpacity={0} />
          <PolarAngleAxis dataKey="mood" tick={false} axisLine={false} />
          <Radar
            name="Reading Personality"
            dataKey="value"
            stroke="none"
            fill={fillColor}
            fillOpacity={0.3}
            isAnimationActive={true}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
