import { redirect } from "next/navigation";
import { AdminUsersTable } from "@/components/dashboard/admin-users-table";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { emailsByUserId } from "@/lib/admin-user-emails";
import { fetchActivePatientProfiles } from "@/lib/active-patients-query";
import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  if (!hasSupabaseEnv()) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const profiles = await fetchActivePatientProfiles<{
    id: string;
    full_name: string | null;
    phone: string | null;
    due_date: string | null;
  }>(supabase, "id, full_name, phone, due_date");

  const emailById = await emailsByUserId();
  const rows = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    phone: p.phone,
    due_date: p.due_date,
    email: emailById.get(p.id) ?? null,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active patients only. Archive is a soft deactivation (sign-out + inactive list); restore anytime from
          Profile Settings → Archived users.
        </p>
      </div>

      <AdminUsersTable rows={rows} isAdmin />
    </div>
  );
}
