"use client";

import Link from "next/link";
import { use } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";
import PlatformBreakdown from "@/components/charts/platform-breakdown";
import RevenueChart from "@/components/charts/revenue-chart";
import SalesVelocityChart from "@/components/charts/sales-velocity-chart";
import ProjectionChart from "@/components/charts/projection-chart";
import SalesTable from "@/components/sales-table";
import StatCard from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import { trpc, trpcClient, queryClient } from "@/utils/trpc";

import { Edit3Icon, PlusIcon, SparklesIcon, DownloadIcon } from "lucide-react";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const event = useQuery(trpc.events.byId.queryOptions({ id }));
  const revenue = useQuery(trpc.analytics.revenue.queryOptions({ eventId: id }));
  const velocity = useQuery(trpc.analytics.velocity.queryOptions({ eventId: id }));
  const projections = useQuery(trpc.analytics.projections.queryOptions({ eventId: id }));
  const sales = useQuery(trpc.sales.byEvent.queryOptions({ eventId: id }));

  const deleteMutation = useMutation({
    mutationFn: (saleId: string) => trpcClient.sales.delete.mutate({ id: saleId }),
    onMutate: async (saleId) => {
      await queryClient.cancelQueries({ queryKey: trpc.sales.byEvent.queryKey({ eventId: id }) });
      const previousSales = queryClient.getQueryData(trpc.sales.byEvent.queryKey({ eventId: id }));
      queryClient.setQueryData(trpc.sales.byEvent.queryKey({ eventId: id }), (old) =>
        old?.filter((s) => s.id !== saleId)
      );
      return { previousSales };
    },
    onError: (err, saleId, context) => {
      if (context?.previousSales) {
        queryClient.setQueryData(trpc.sales.byEvent.queryKey({ eventId: id }), context.previousSales);
      }
      toast.error(err.message);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.sales.byEvent.queryKey({ eventId: id }) }),
        queryClient.invalidateQueries({ queryKey: trpc.events.byId.queryKey({ id }) }),
        queryClient.invalidateQueries({ queryKey: trpc.dashboard.overview.queryKey() }),
      ]);
    },
    onSuccess: () => {
      toast.success("Sale deleted");
    },
  });

  const handleDeleteSale = (saleId: string) => {
    if (confirm("Are you sure you want to delete this sale?")) {
      deleteMutation.mutate(saleId);
    }
  };

  const handleExportCSV = () => {
    if (!sales.data || sales.data.length === 0) {
      toast.error("No sales data to export");
      return;
    }

    const headers = ["Date", "Platform", "Ticket Type", "Quantity", "Price per Ticket", "Fees", "Gross"];
    const rows = sales.data.map((s) => {
      const date = s.saleDate ? format(new Date(s.saleDate), "yyyy-MM-dd") : "";
      const platform = s.platform?.name ?? "Manual";
      const ticketType = s.ticketType ?? "";
      const quantity = s.quantity;
      const price = s.pricePerTicket;
      const fees = s.fees ?? 0;
      const gross = quantity * price + fees;
      return [date, platform, ticketType, quantity, price, fees, gross];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${event.data?.name ?? "event"}-sales.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales exported to CSV");
  };

  const title = event.data?.name ?? "Event";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={event.data ? `${format(new Date(event.data.date), "PPP")} • ${event.data.venue ?? "Venue TBD"}` : undefined}
        crumbs={[{ label: "Events", href: "/events" }, { label: title }]}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-none">
              <Link href={`/events/${id}/edit`}>
                <Edit3Icon className="mr-2 size-4" />
                Edit
              </Link>
            </Button>
            <Button asChild className="rounded-none">
              <Link href={`/events/${id}/sales/new`}>
                <PlusIcon className="mr-2 size-4" />
                Manual sale
              </Link>
            </Button>
          </div>
        }
      />

      {event.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-none" />
          ))}
          <Skeleton className="h-[320px] rounded-none md:col-span-2" />
          <Skeleton className="h-[320px] rounded-none" />
        </div>
      ) : event.isError ? (
        <EmptyState title="Event not found" description={event.error.message} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Revenue"
              value={revenue.data ? formatCurrency(revenue.data.totalRevenue) : "—"}
              hint={revenue.data ? `Net: ${formatCurrency(revenue.data.netRevenue)}` : ""}
              icon={<SparklesIcon className="size-4" />}
            />
            <StatCard
              title="Tickets sold"
              value={velocity.data ? formatNumber(velocity.data.totalTicketsSold) : "—"}
              hint={velocity.data ? `Daily avg: ${formatNumber(Math.round(velocity.data.dailyAverage))}` : ""}
            />
            <StatCard
              title="Projected"
              value={projections.data ? formatCurrency(projections.data.projectedTotalRevenue) : "—"}
              hint={projections.data ? `Confidence: ${projections.data.confidenceLevel}` : ""}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {velocity.isLoading ? (
                <Skeleton className="h-[320px] rounded-none" />
              ) : velocity.isError ? (
                <EmptyState title="Couldn’t load velocity" description={velocity.error.message} />
              ) : velocity.data ? (
                <RevenueChart
                  data={velocity.data.salesByDay.map((d) => ({
                    date: format(new Date(d.date), "MMM d"),
                    revenue: d.revenue,
                  }))}
                />
              ) : (
                <EmptyState title="No velocity data" />
              )}
            </div>
            {revenue.isLoading ? (
              <Skeleton className="h-[320px] rounded-none" />
            ) : revenue.isError ? (
              <EmptyState title="Couldn't load revenue" description={revenue.error.message} />
            ) : revenue.data ? (
              <PlatformBreakdown
                data={revenue.data.revenueByPlatform.map((p) => ({
                  name: p.platformName,
                  value: p.revenue,
                }))}
              />
            ) : (
              <EmptyState title="No revenue data" />
            )}

            <div className="lg:col-span-2">
              {velocity.isLoading ? (
                <Skeleton className="h-[320px] rounded-none" />
              ) : velocity.isError ? (
                <EmptyState title="Couldn't load velocity" description={velocity.error.message} />
              ) : velocity.data ? (
                <SalesVelocityChart
                  data={velocity.data.salesByDay.map((d) => ({
                    date: format(new Date(d.date), "MMM d"),
                    ticketsSold: d.ticketsSold,
                  }))}
                />
              ) : (
                <EmptyState title="No velocity data" />
              )}
            </div>
            {projections.isLoading ? (
              <Skeleton className="h-[320px] rounded-none" />
            ) : projections.isError ? (
              <EmptyState title="Couldn't load projections" description={projections.error.message} />
            ) : projections.data ? (
              <ProjectionChart
                data={(() => {
                  // Build small curve based on current and projected.
                  const now = new Date(projections.data.asOf);
                  const days = 7;
                  const start = revenue.data?.totalRevenue ?? 0;
                  const end = projections.data.projectedTotalRevenue;
                  return Array.from({ length: days }, (_, i) => {
                    const t = i / (days - 1);
                    const value = start + (end - start) * (0.2 + 0.8 * t) * t;
                    const d = new Date(now);
                    d.setDate(d.getDate() + i);
                    return { date: format(d, "MMM d"), projectedRevenue: value };
                  });
                })()}
                note={`As of ${format(new Date(projections.data.asOf), "PPp")}`}
              />
            ) : (
              <EmptyState title="No projections data" />
            )}
          </div>

          <Card className="rounded-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">Sales</CardTitle>
                <div className="mt-1 text-xs text-muted-foreground">Raw sales entries for this event.</div>
               </div>
               <div className="flex items-center gap-2">
                 <Button
                   variant="outline"
                   className="rounded-none"
                   onClick={handleExportCSV}
                   disabled={!sales.data || sales.data.length === 0}
                 >
                   <DownloadIcon className="mr-2 size-4" />
                   Export CSV
                 </Button>
                 <Button asChild variant="outline" className="rounded-none">
                   <Link href={`/events/${id}/sales/new`}>Add manual sale</Link>
                 </Button>
               </div>
             </CardHeader>
            <CardContent>
              {sales.isLoading ? (
                <Skeleton className="h-28 rounded-none" />
              ) : sales.isError ? (
                <EmptyState title="Couldn’t load sales" description={sales.error.message} />
              ) : !sales.data || sales.data.length === 0 ? (
                <EmptyState
                  title="No sales logged"
                  description="Add manual sales or connect a platform integration to start populating analytics."
                  action={{ label: "Add manual sale", href: `/events/${id}/sales/new` }}
                />
              ) : sales.data ? (
                <SalesTable
                  rows={sales.data.map((s) => ({
                    id: s.id,
                    saleDate: s.saleDate,
                    platform: s.platform ? { name: s.platform.name } : null,
                    ticketType: s.ticketType,
                    quantity: s.quantity,
                    pricePerTicket: s.pricePerTicket,
                    fees: s.fees,
                  }))}
                  editHref={(s) => `/events/${id}/sales/${s.id}`}
                  onDelete={handleDeleteSale}
                />
              ) : (
                <EmptyState title="No sales data" />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
