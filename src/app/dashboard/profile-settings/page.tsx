import { redirect } from "next/navigation";
import { updateProfileSettings } from "@/app/actions/profile-settings";
import type { ArchivedAppointmentRow } from "@/components/dashboard/admin-archived-appointments-table";
import { ProfileSettingsTabs } from "@/components/dashboard/profile-settings-tabs";
import type { ArchivedUserRow } from "@/components/dashboard/archived-users-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailsByUserId } from "@/lib/admin-user-emails";
import { isMissingArchivedAtSchemaError } from "@/lib/active-patients-query";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Search = { saved?: string; error?: string };

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!hasSupabaseEnv()) {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  let archivedRows: ArchivedUserRow[] = [];
  let archivedAppointmentRows: ArchivedAppointmentRow[] = [];
  if (isAdmin) {
    const archRes = await supabase
      .from("profiles")
      .select("id, full_name, phone, archived_at")
      .eq("role", "patient")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (!archRes.error && archRes.data) {
      const emailById = await emailsByUserId();
      archivedRows = archRes.data.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        phone: p.phone,
        archived_at: p.archived_at as string,
        email: emailById.get(p.id) ?? null,
      }));
    } else if (archRes.error && !isMissingArchivedAtSchemaError(archRes.error)) {
      archivedRows = [];
    }

    const arApptRes = await supabase
      .from("appointments")
      .select(
        "id, patient_id, start_time, end_time, status, appointment_type, patient_email, is_telehealth, created_at, archived_at"
      )
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    if (!arApptRes.error && arApptRes.data) {
      const ids = [...new Set(arApptRes.data.map((a) => a.patient_id))];
      const { data: nameRows } =
        ids.length > 0
          ? await supabase.from("profiles").select("id, full_name").in("id", ids)
          : { data: [] as { id: string; full_name: string | null }[] };
      const nameById = new Map((nameRows ?? []).map((p) => [p.id, p.full_name] as const));
      archivedAppointmentRows = arApptRes.data.map((a) => ({
        id: a.id,
        patient_id: a.patient_id,
        patient_name: nameById.get(a.patient_id) ?? null,
        patient_email: a.patient_email ?? null,
        appointment_type: a.appointment_type,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        is_telehealth: Boolean(a.is_telehealth),
        created_at: a.created_at,
        archived_at: a.archived_at as string,
      }));
    } else if (arApptRes.error) {
      if (!isMissingArchivedAtSchemaError(arApptRes.error)) {
        console.error("[profile-settings] archived appointments:", arApptRes.error.message);
      }
      archivedAppointmentRows = [];
    }
  }

  const accountSection = (
    <>
      {sp.saved === "1" && (
        <p
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          Settings updated.
        </p>
      )}
      {sp.error && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {decodeURIComponent(sp.error)}
        </p>
      )}

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Account details</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            For security, confirm your new details using your password.
          </p>
        </CardHeader>
        <CardContent>
          <form action={updateProfileSettings} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="rounded-xl"
                defaultValue={user.email ?? ""}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                className="rounded-xl"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" className="rounded-full">
                Update settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Your account, archived patients, and archived appointments."
            : "Update your email and password."}
        </p>
      </div>

      <ProfileSettingsTabs
        isAdmin={isAdmin}
        archivedRows={archivedRows}
        archivedAppointmentRows={archivedAppointmentRows}
      >
        {accountSection}
      </ProfileSettingsTabs>
    </div>
  );
}
