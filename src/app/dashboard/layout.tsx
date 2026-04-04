import { hasSupabaseEnv } from "@/lib/supabase/env";
import DashboardRoleShell from "./dashboard-role-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <>{children}</>;
  }

  // Await role + shell on the server. A Suspense fallback here could stick forever if
  // Supabase/session work never completes or streaming stalls; the layout is already async.
  return <DashboardRoleShell>{children}</DashboardRoleShell>;
}
