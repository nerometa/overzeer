"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import PageHeader from "@/components/page-header";
import StatCard from "@/components/stat-card";
import EmptyState from "@/components/empty-state";
import SalesTable from "@/components/sales-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import { trpc } from "@/utils/trpc";

import { CalendarPlusIcon, CoinsIcon, TicketIcon, TelescopeIcon } from "lucide-react";

export default function DashboardOverviewPage() {
  const overview = useQuery(trpc.dashboard.overview.queryOptions());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A quick read on revenue, volume, and what just happened."
        crumbs={[{ label: "Dashboard" }]}
        actions={
          <Button asChild className="rounded-none">
            <Link href="/events/new">
              <CalendarPlusIcon className="mr-2 size-4" />
              New event
            </Link>
          </Button>
        }
      />

      {overview.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-none" />
          ))}
        </div>
      ) : overview.isError ? (
        <EmptyState title="Couldn't load dashboard overview" description={overview.error.message} />
      ) : overview.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total revenue"
              value={formatCurrency(overview.data.totalRevenue)}
              hint="Across all events"
              icon={<CoinsIcon className="size-4" />}
            />
            <StatCard
              title="Tickets sold"
              value={formatNumber(overview.data.totalTicketsSold)}
              hint="Including manual sales"
              icon={<TicketIcon className="size-4" />}
            />
            <StatCard
              title="Events"
              value={formatNumber(overview.data.totalEvents)}
              hint="Tracked events"
              icon={<TelescopeIcon className="size-4" />}
            />
          </div>

          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Recent sales</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">
                  Latest transactions across all events.
                </div>
              </div>
              <Button asChild variant="outline" className="rounded-none">
                <Link href="/events">View events</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {overview.data.recentSales.length === 0 ? (
                <EmptyState
                  title="No sales yet"
                  description="Create an event and add sales (or manual entries) to start seeing analytics."
                  action={{ label: "Create your first event", href: "/events/new" }}
                />
              ) : (
                <SalesTable
                  compact
                  rows={overview.data.recentSales.map((r) => ({
                    id: r.sale.id,
                    saleDate: r.sale.saleDate,
                    platform: r.platform
                      ? {
                          name: r.platform.name,
                          colorHex: r.platform.colorHex,
                        }
                      : null,
                    ticketType: r.sale.ticketType ?? null,
                    quantity: r.sale.quantity,
                    pricePerTicket: r.sale.pricePerTicket,
                    fees: r.sale.fees ?? 0,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="No data available" description="Unable to load dashboard data." />
      )}
    </div>
  );
}
