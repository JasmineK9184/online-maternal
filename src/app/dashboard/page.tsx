import { redirect } from "next/navigation";
import {
  AdminControlTower,
  type AdminActivityRow,
} from "@/components/dashboard/admin-control-tower";
import { PatientJourneyView } from "@/components/dashboard/patient-journey-view";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { fetchActivePatientProfiles } from "@/lib/active-patients-query";
import { pregnancyWeekFromProfile } from "@/lib/maternal";

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <SupabaseSetupNotice />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRole } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const role = profileRole?.role === "admin" ? "admin" : "patient";

  if (role === "admin") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayStart = today.toISOString();
    const tomorrowStart = tomorrow.toISOString();

    const apptSelect =
      "id, created_at, start_time, end_time, appointment_type, status, patient_id, patient_email, is_telehealth" as const;

    const [pendingApptsRes, recentApptsRes, todaysApptsRes, patients] = await Promise.all([
      supabase
        .from("appointments")
        .select(apptSelect)
        .eq("status", "pending")
        .is("archived_at", null)
        .order("start_time", { ascending: true }),
      supabase
        .from("appointments")
        .select(apptSelect)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(35),
      supabase
        .from("appointments")
        .select(apptSelect)
        .is("archived_at", null)
        .gte("start_time", todayStart)
        .lt("start_time", tomorrowStart)
        .order("start_time", { ascending: true }),
      fetchActivePatientProfiles<{
        id: string;
        full_name: string | null;
        phone: string | null;
        due_date: string | null;
        lmp_date: string | null;
      }>(supabase, "id, full_name, phone, due_date, lmp_date"),
    ]);
    const todaysRaw = todaysApptsRes.data ?? [];
    const todaysNonCancelled = todaysRaw.filter((a) => a.status !== "cancelled");
    const pendingRaw = pendingApptsRes.data ?? [];
    const recent = recentApptsRes.data ?? [];

    const patientIdsForNames = Array.from(
      new Set([
        ...recent.map((r) => r.patient_id),
        ...todaysNonCancelled.map((r) => r.patient_id),
        ...pendingRaw.map((r) => r.patient_id),
      ])
    );
    const { data: nameRows } =
      patientIdsForNames.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", patientIdsForNames)
        : { data: [] as { id: string; full_name: string | null }[] };

    const nameById = new Map((nameRows ?? []).map((r) => [r.id, r.full_name]));

    const toMetricAppt = (r: (typeof recent)[number]) => ({
      id: r.id,
      created_at: r.created_at,
      start_time: r.start_time,
      end_time: r.end_time,
      appointment_type: r.appointment_type,
      status: r.status,
      patient_name: nameById.get(r.patient_id) ?? null,
      patient_email: r.patient_email ?? null,
      is_telehealth: Boolean(r.is_telehealth),
    });

    const todaysAppointments = todaysNonCancelled.map(toMetricAppt);
    const pendingAppointments = pendingRaw.map(toMetricAppt);

    const activity: AdminActivityRow[] = recent.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      start_time: r.start_time,
      end_time: r.end_time,
      appointment_type: r.appointment_type,
      status: r.status,
      patient_name: nameById.get(r.patient_id) ?? null,
      patient_email: r.patient_email ?? null,
      is_telehealth: Boolean(r.is_telehealth),
    }));

    const rawName = (profileRole?.full_name ?? "").trim();
    const adminDisplayName = rawName ? `${rawName} Admin` : null;

    return (
      <AdminControlTower
        adminName={adminDisplayName}
        patients={patients}
        todaysAppointments={todaysAppointments}
        pendingAppointments={pendingAppointments}
        availabilityHref="/dashboard/availability"
        activity={activity}
      />
    );
  }

  const { data: patientProfile } = await supabase
    .from("profiles")
    .select("due_date, lmp_date")
    .eq("id", user.id)
    .single();

  const dueDateMissing = patientProfile?.due_date == null;
  const week = pregnancyWeekFromProfile(
    patientProfile?.due_date ?? null,
    patientProfile?.lmp_date ?? null
  );

  let dailyTip: {
    week_number: number;
    title: string;
    description: string | null;
  } | null = null;

  if (week !== null) {
    const { data: tip } = await supabase
      .from("milestones")
      .select("week_number, title, description")
      .lte("week_number", week)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    dailyTip = tip ?? null;
  } else {
    const { data: tip } = await supabase
      .from("milestones")
      .select("week_number, title, description")
      .order("week_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    dailyTip = tip ?? null;
  }

  const now = new Date().toISOString();
  const { data: nextAppt } = await supabase
    .from("appointments")
    .select("id, start_time, appointment_type, status")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .is("archived_at", null)
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <PatientJourneyView
      fullName={profileRole?.full_name ?? null}
      week={week}
      dueDateMissing={dueDateMissing}
      nextAppt={nextAppt ?? null}
      dailyTip={dailyTip}
      hidePatientJourneyChrome={profileRole?.role === "admin"}
    />
  );
}
