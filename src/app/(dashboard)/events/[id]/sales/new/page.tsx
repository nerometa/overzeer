"use client";

import { use } from "react";

import PageHeader from "@/components/page-header";
import SalesEntryForm from "@/components/sales-entry-form";

export default function NewManualSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual sale"
        description="Log door / cash sales to keep revenue and sellout projections accurate." 
        crumbs={[{ label: "Events", href: "/events" }, { label: "Event", href: `/events/${id}` }, { label: "Manual sale" }]}
      />
      <SalesEntryForm eventId={id} />
    </div>
  );
}
