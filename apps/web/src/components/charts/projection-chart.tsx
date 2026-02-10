"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChartShell from "@/components/charts/chart-shell";
import { formatCurrency } from "@/lib/format";

type Point = { date: string; projectedRevenue: number };

export default function ProjectionChart({
  title = "Projections",
  data,
  note,
}: {
  title?: string;
  data: Point[];
  note?: string;
}) {
  return (
    <ChartShell title={title} description={note ?? "Projected revenue curve"}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 6, right: 10, top: 6, bottom: 0 }}>
          <defs>
            <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.55} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            width={56}
            tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? formatCurrency(v) : String(v))}
            contentStyle={{
              background: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="projectedRevenue"
            stroke="hsl(var(--chart-3))"
            fill="url(#projFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
