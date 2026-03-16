import PageHeader from "@/components/page-header";
import EventForm from "@/components/event-form";

export default function NewEventPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New event"
        description="Create an event—then start logging sales." 
        crumbs={[{ label: "Events", href: "/events" }, { label: "New" }]}
      />
      <EventForm mode="create" />
    </div>
  );
}
