"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import PageHeader from "@/components/page-header";
import SalesEntryForm, { type SaleData } from "@/components/sales-entry-form";
import EmptyState from "@/components/empty-state";
import { eventsApi, salesApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditSalePage({ 
  params 
}: { 
  params: Promise<{ id: string; saleId: string }> 
}) {
  const { id, saleId } = use(params);
  
  const event = useQuery(eventsApi.byId({ params: { id } }));
  const sales = useQuery(salesApi.byEvent({ params: { eventId: id } }));
  
  const sale = sales.data?.find((s) => s.id === saleId);
  
  const saleData: SaleData | undefined = sale ? {
    id: sale.id,
    platform: sale.platform ? { 
      id: sale.platform.id, 
      name: sale.platform.name 
    } : null,
    ticketType: sale.ticketType,
    quantity: sale.quantity,
    pricePerTicket: sale.pricePerTicket,
    fees: sale.fees,
    saleDate: sale.saleDate,
  } : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit sale"
        description={event.data ? `Editing sale for ${event.data.name}` : "Edit sale details"}
        crumbs={[
          { label: "Events", href: "/events" },
          { label: event.data?.name ?? "Event", href: `/events/${id}` },
          { label: "Edit sale" },
        ]}
      />

      {event.isLoading || sales.isLoading ? (
        <Skeleton className="h-[400px] rounded-none" />
      ) : event.isError ? (
        <EmptyState title="Event not found" description={event.error.message} />
      ) : sales.isError ? (
        <EmptyState title="Could not load sales" description={sales.error.message} />
      ) : !saleData ? (
        <EmptyState 
          title="Sale not found" 
          description="The sale you're looking for doesn't exist or has been deleted."
          action={{ label: "Back to event", href: `/events/${id}` }}
        />
      ) : (
        <SalesEntryForm eventId={id} sale={saleData} />
      )}
    </div>
  );
}
