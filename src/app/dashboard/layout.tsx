import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Suspense } from "react";
import DashboardRoleShell from "./dashboard-role-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <>{children}</>;
  }

  // Show a stable sidebar shell while the server fetches role.
  // This avoids flicker and keeps availability/profile tabs consistent.
  return (
    <Suspense
      fallback={
        <DashboardShell isAdmin={null}>
          <div className="text-sm text-muted-foreground">Loading dashboard…</div>
        </DashboardShell>
      }
    >
      <DashboardRoleShell>{children}</DashboardRoleShell>
    </Suspense>
  );
}
