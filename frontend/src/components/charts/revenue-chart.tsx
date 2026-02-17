"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChartShell from "@/components/charts/chart-shell";
import { formatCurrency } from "@/lib/format";

type Point = { date: string; revenue: number };

const LABEL_MAP: Record<string, string> = {
  revenue: "Revenue",
};

export default function RevenueChart({
  title = "Revenue",
  data,
}: {
  title?: string;
  data: Point[];
}) {
  return (
    <ChartShell title={title} description="Gross revenue over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 6, right: 10, top: 6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            width={56}
            tickFormatter={(v) => (typeof v === "number" ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            formatter={(v: unknown, name?: string) => [
              typeof v === "number" ? formatCurrency(v) : String(v),
              name ? (LABEL_MAP[name] ?? name) : "",
            ]}
            labelFormatter={(label) => `Date: ${String(label)}`}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: 0,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            itemStyle={{
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
