"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import ChartShell from "@/components/charts/chart-shell";
import { formatNumber } from "@/lib/format";

type Point = { date: string; ticketsSold: number };

export default function SalesVelocityChart({
  title = "Sales velocity",
  data,
}: {
  title?: string;
  data: Point[];
}) {
  return (
    <ChartShell title={title} description="Tickets sold per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 6, right: 10, top: 6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={12}
            width={46}
            tickFormatter={(v) => (typeof v === "number" ? formatNumber(v) : String(v))}
          />
          <Tooltip
            formatter={(v) => (typeof v === "number" ? formatNumber(v) : String(v))}
            contentStyle={{
              background: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          <Bar dataKey="ticketsSold" fill="hsl(var(--chart-1))" radius={0} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
