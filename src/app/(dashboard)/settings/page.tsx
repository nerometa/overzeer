import EmptyState from "@/components/empty-state";
import PageHeader from "@/components/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" crumbs={[{ label: "Settings" }]} />
      <EmptyState title="Settings coming soon" description="Platform integrations and team access will live here." />
    </div>
  );
}
