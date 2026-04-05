import Link from "next/link";
import { redirect } from "next/navigation";
import { BookingWizard } from "@/components/booking-wizard";
import {
  AdminAppointmentsTable,
  type AdminAppointmentRow,
} from "@/components/dashboard/admin-appointments-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isMissingArchivedAtSchemaError,
  withArchivedAtFilterFallback,
} from "@/lib/active-patients-query";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { pregnancyWeekFromProfile } from "@/lib/maternal";

type MyAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  appointment_type: string;
};

type Search = { error?: string | string[] };

function statusBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "cancelled")
    return <Badge variant="destructive">Cancelled</Badge>;
  if (s === "pending")
    return <Badge variant="outline">Pending approval</Badge>;
  if (s === "completed")
    return <Badge variant="secondary">Completed</Badge>;
  if (s === "scheduled")
    return <Badge variant="success">Scheduled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!hasSupabaseEnv()) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const errRaw = sp.error;
  const actionError =
    typeof errRaw === "string"
      ? errRaw
      : Array.isArray(errRaw)
        ? errRaw[0]
        : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("due_date, lmp_date, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    const apptsRes = await withArchivedAtFilterFallback(async (filterArchived) => {
      let q = supabase
        .from("appointments")
        .select(
          "id, patient_id, start_time, end_time, status, appointment_type, patient_email, is_telehealth, created_at"
        );
      if (filterArchived) q = q.is("archived_at", null);
      return q.order("start_time", { ascending: true });
    });
    const allAppts = apptsRes.data;
    if (apptsRes.error && !isMissingArchivedAtSchemaError(apptsRes.error)) {
      console.error("[appointments] admin list:", apptsRes.error.message);
    }

    const list = allAppts ?? [];
    const patientIds = [...new Set(list.map((a) => a.patient_id))];
    const { data: profRows } =
      patientIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", patientIds)
        : { data: [] as { id: string; full_name: string | null }[] };

    const nameById = new Map(
      (profRows ?? []).map((p) => [p.id, p.full_name] as const)
    );

    const adminRows: AdminAppointmentRow[] = list.map((a) => ({
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
    }));

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            Manage Appointments
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review requests, approve visits, and notify patients by email. Archived visits are in{" "}
            <Link
              href="/dashboard/profile-settings"
              className="font-medium text-[#4B7B7F] underline decoration-[#4B7B7F]/40 underline-offset-2 hover:decoration-[#4B7B7F]"
            >
              Profile Settings
            </Link>{" "}
            under <span className="font-medium text-foreground">Archived appointments</span>.
          </p>
        </div>

        <AdminAppointmentsTable rows={adminRows} actionError={actionError} />
      </div>
    );
  }

  const week = pregnancyWeekFromProfile(
    profile?.due_date ?? null,
    profile?.lmp_date ?? null
  );

  const { data: myAppts } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, appointment_type")
    .eq("patient_id", user.id)
    .is("archived_at", null)
    .order("start_time", { ascending: true });

  const list = (myAppts ?? []) as MyAppointment[];
  const nowMs = Date.now();
  const upcoming = list.filter((a) => new Date(a.start_time).getTime() >= nowMs);
  const past = list
    .filter((a) => new Date(a.start_time).getTime() < nowMs)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Appointments
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Book a visit and see what&apos;s coming up.
        </p>
      </div>

      <BookingWizard currentWeek={week} />

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {upcoming.length === 0 && (
              <li className="rounded-2xl bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                None scheduled yet. Choose a time above to book.
              </li>
            )}
            {upcoming.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-2xl border border-border/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{a.appointment_type}</span>
                  {statusBadge(a.status)}
                </div>
                <span className="text-muted-foreground">
                  {new Date(a.start_time).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Past</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {past.length === 0 && (
              <li className="rounded-2xl bg-muted/30 px-4 py-6 text-center text-muted-foreground">
                No past visits yet.
              </li>
            )}
            {past.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-2xl border border-border/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{a.appointment_type}</span>
                  {statusBadge(a.status)}
                </div>
                <span className="text-muted-foreground">
                  {new Date(a.start_time).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
