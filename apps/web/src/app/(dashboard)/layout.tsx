import { headers } from "next/headers";
import { redirect } from "next/navigation";

import DashboardShell from "@/components/dashboard-shell";
import { authClient } from "@/lib/auth-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });

  if (!session.data?.user) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
