"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import PlatformBreakdown from "@/components/charts/platform-breakdown";
import ProjectionChart from "@/components/charts/projection-chart";
import RevenueChart from "@/components/charts/revenue-chart";
import SalesVelocityChart from "@/components/charts/sales-velocity-chart";
import StatCard from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import { eventsApi, analyticsApi } from "@/lib/api";

import { ArrowRightIcon } from "lucide-react";

export default function AnalyticsDeepDivePage() {
  const events = useQuery(eventsApi.list());
  const [eventId, setEventId] = useState<string>("");

  const selectedId = eventId || events.data?.[0]?.id || "";
  const comprehensive = useQuery(
    analyticsApi.comprehensive({ params: { eventId: selectedId } }),
  );

  const revenueSeries = useMemo(() => {
    const salesByDay = comprehensive.data?.velocity.salesByDay ?? [];
    return salesByDay.map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      revenue: d.revenue,
    }));
  }, [comprehensive.data]);

  const velocitySeries = useMemo(() => {
    const salesByDay = comprehensive.data?.velocity.salesByDay ?? [];
    return salesByDay.map((d) => ({
      date: format(new Date(d.date), "MMM d"),
      ticketsSold: d.ticketsSold,
    }));
  }, [comprehensive.data]);

  const platformSlices = useMemo(() => {
    const byPlatform = comprehensive.data?.revenue.revenueByPlatform ?? [];
    return byPlatform.map((p) => ({
      name: p.platformName,
      value: p.revenue,
      colorHex: p.colorHex ?? null,
    }));
  }, [comprehensive.data]);

  const projectionSeries = useMemo(() => {
    // Router only returns summary; create a simple 7-day curve ending at projected.
    const proj = comprehensive.data?.projections;
    if (!proj) return [] as { date: string; projectedRevenue: number }[];
    const now = new Date(proj.asOf);
    const days = 7;
    const start = (comprehensive.data?.revenue.totalRevenue ?? 0) * 0.98;
    const end = proj.projectedTotalRevenue;
    return Array.from({ length: days }, (_, i) => {
      const t = i / (days - 1);
      const value = start + (end - start) * (0.25 + 0.75 * t) * t;
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      return { date: format(d, "MMM d"), projectedRevenue: value };
    });
  }, [comprehensive.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Deep dive across a single event: revenue, velocity, projection confidence."
        crumbs={[{ label: "Analytics" }]}
        actions={
          <Button asChild variant="outline" className="rounded-none">
            <Link href="/events">
              Events <ArrowRightIcon className="ml-2 size-4" />
            </Link>
          </Button>
        }
      />

      {events.isLoading ? (
        <Skeleton className="h-10 rounded-none" />
      ) : events.isError ? (
        <EmptyState title="Couldn't load events" description={events.error.message} />
      ) : !events.data || events.data.length === 0 ? (
        <EmptyState
          title="No events to analyze"
          description="Create an event and start logging sales to unlock analytics."
          action={{ label: "Create event", href: "/events/new" }}
        />
      ) : (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <div className="text-xs text-muted-foreground">Select event</div>
            <Select value={selectedId} onValueChange={(v) => v && setEventId(v)}>
              <SelectTrigger className="mt-1 w-full rounded-none md:w-[420px]">
                <SelectValue placeholder="Choose event" />
              </SelectTrigger>
              <SelectContent>
                {events.data?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} — {format(new Date(e.date), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {selectedId && (comprehensive.isLoading || comprehensive.isFetching) ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-none" />
          ))}
          <Skeleton className="h-[320px] rounded-none md:col-span-2" />
          <Skeleton className="h-[320px] rounded-none" />
        </div>
      ) : comprehensive.isError ? (
        <EmptyState title="Couldn’t load analytics" description={comprehensive.error.message} />
      ) : comprehensive.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Gross revenue" value={formatCurrency(comprehensive.data.revenue.totalRevenue)} />
            <StatCard title="Tickets sold" value={formatNumber(comprehensive.data.velocity.totalTicketsSold)} />
            <StatCard
              title="Projected revenue"
              value={formatCurrency(comprehensive.data.projections.projectedTotalRevenue)}
              hint={`Confidence: ${comprehensive.data.projections.confidenceLevel}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart data={revenueSeries} />
            </div>
            <PlatformBreakdown data={platformSlices} />
            <div className="lg:col-span-2">
              <SalesVelocityChart data={velocitySeries} />
            </div>
            <ProjectionChart
              data={projectionSeries}
              note={`As of ${format(new Date(comprehensive.data.projections.asOf), "PPp")}`}
            />
          </div>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="text-sm">Projection snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">% sold</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {comprehensive.data.projections.percentageSold === null
                      ? "—"
                      : `${Math.round(comprehensive.data.projections.percentageSold)}%`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Days until sellout</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {comprehensive.data.projections.daysUntilSellout ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Projected tickets</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {formatNumber(comprehensive.data.projections.projectedTotalTickets)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Trend</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {comprehensive.data.velocity.trend}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="Select an event" description="Choose an event to view analytics." />
      )}
    </div>
  );
}
