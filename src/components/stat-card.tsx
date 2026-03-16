import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({
  title,
  value,
  icon,
  hint,
  trend,
}: {
  title: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  trend?: { label: string; tone?: "up" | "down" | "neutral" };
}) {
  const tone = trend?.tone ?? "neutral";
  const toneCls =
    tone === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </div>
          {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="grid size-9 place-items-center rounded-none border bg-muted/30">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-3">
          <div className="text-2xl font-semibold tracking-tight">{value}</div>
          {trend ? (
            <div className={cn("text-xs", toneCls)}>{trend.label}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
