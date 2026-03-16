"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/empty-state";
import EventForm from "@/components/event-form";
import PageHeader from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { eventsApi } from "@/lib/api";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const event = useQuery(eventsApi.byId({ params: { id } }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit event"
        description="Tighten details before the numbers start moving." 
        crumbs={[{ label: "Events", href: "/events" }, { label: event.data?.name ?? "Event", href: `/events/${id}` }, { label: "Edit" }]}
      />

      {event.isLoading ? (
        <Skeleton className="h-[420px] rounded-none" />
      ) : event.isError ? (
        <EmptyState title="Couldn't load event" description={event.error.message} />
      ) : event.data ? (
        <EventForm
          mode="edit"
          initial={{
            id: event.data.id,
            name: event.data.name,
            date: event.data.date,
            venue: event.data.venue,
            totalCapacity: event.data.totalCapacity,
          }}
        />
      ) : (
        <EmptyState title="Event not found" description="The requested event could not be found." />
      )}
    </div>
  );
}
