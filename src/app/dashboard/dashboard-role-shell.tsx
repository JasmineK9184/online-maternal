import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardRoleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <>{children}</>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const { data: archiveRow, error: archiveErr } = await supabase
    .from("profiles")
    .select("archived_at")
    .eq("id", user.id)
    .maybeSingle();

  const archivedAt =
    !archiveErr && archiveRow && "archived_at" in archiveRow
      ? (archiveRow as { archived_at: string | null }).archived_at
      : null;

  if (archivedAt) {
    await supabase.auth.signOut();
    redirect("/login?archived=1");
  }

  const isAdmin = profile?.role === "admin";
  return <DashboardShell isAdmin={isAdmin}>{children}</DashboardShell>;
}

