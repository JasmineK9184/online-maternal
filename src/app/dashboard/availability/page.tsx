import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCalendar } from "@/components/admin-calendar";
import { AdminSlotsPanel, type AdminSlotRow } from "@/components/admin-slots-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AvailabilityPage() {
  if (!hasSupabaseEnv()) {
    redirect("/dashboard");
  }

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

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: slots, error: slotsErr } = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time, label")
    .order("start_time", { ascending: true });

  const { data: bookedRows } = await supabase
    .from("appointments")
    .select("slot_id")
    .not("slot_id", "is", null)
    .neq("status", "cancelled");

  const { data: allAppts } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, appointment_type, patient_id")
    .order("start_time", { ascending: true });

  if (slotsErr) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Could not load slots: {slotsErr.message}</p>
        <Link href="/dashboard" className="text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const bookedIds = new Set(
    (bookedRows ?? []).map((r) => r.slot_id).filter(Boolean) as string[]
  );
  const rows: AdminSlotRow[] = (slots ?? []).map((s) => ({
    ...s,
    booked: bookedIds.has(s.id),
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Clinic admin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage availability slots and review every booking.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Availability slots</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Create and edit bookable times for MaternalCare Sync.
          </p>
        </CardHeader>
        <CardContent>
          <AdminSlotsPanel initialSlots={rows} />
        </CardContent>
      </Card>

      <section className="space-y-4 rounded-2xl border border-primary/15 bg-primary/[0.03] p-6 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-foreground">All bookings</h2>
        <AdminCalendar rows={allAppts ?? []} />
      </section>

      <p className="text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="underline decoration-primary/40 underline-offset-2"
        >
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
