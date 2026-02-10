"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import ChartShell from "@/components/charts/chart-shell";
import { platformColor } from "@/lib/platform-colors";
import { formatCurrency } from "@/lib/format";

type Slice = { name: string; value: number; colorHex?: string | null };

export default function PlatformBreakdown({
  title = "Platforms",
  data,
}: {
  title?: string;
  data: Slice[];
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <ChartShell title={title} description="Revenue share by platform" right={<div className="text-xs text-muted-foreground">{formatCurrency(total)}</div>}>
      <div className="grid h-full grid-cols-1 items-center gap-4 md:grid-cols-[1fr_180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              formatter={(v) => (typeof v === "number" ? formatCurrency(v) : String(v))}
              contentStyle={{
                background: "hsl(var(--popover))",
                borderColor: "hsl(var(--border))",
                borderRadius: 0,
                fontSize: 12,
              }}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={platformColor(d.name, d.colorHex)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {data
            .slice()
            .sort((a, b) => b.value - a.value)
            .map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.name} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-none"
                      style={{ backgroundColor: platformColor(d.name, d.colorHex) }}
                    />
                    <span className="truncate">{d.name}</span>
                  </div>
                  <div className="tabular-nums text-muted-foreground">{pct}%</div>
                </div>
              );
            })}
        </div>
      </div>
    </ChartShell>
  );
}
