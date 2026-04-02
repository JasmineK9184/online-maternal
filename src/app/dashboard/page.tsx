import Link from "next/link";
import { redirect } from "next/navigation";
import { JourneyProgress } from "@/components/journey-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
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

    const { data: todaysAppointments } = await supabase
      .from("appointments")
      .select("id,status,google_event_id")
      .gte("start_time", today.toISOString())
      .lt("start_time", tomorrow.toISOString());

    const rows = todaysAppointments ?? [];
    const totalBookingsToday = rows.filter((a) => a.status !== "cancelled")
      .length;
    const pendingRequests = rows.filter(
      (a) => a.status === "scheduled" && !a.google_event_id
    ).length;

    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Clinic Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profileRole?.full_name
              ? `Welcome back, ${profileRole.full_name}`
              : "Welcome back"}
          </p>
        </div>

        <Card className="border-border/40 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">
              Today&apos;s snapshot
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Quick totals for the current day.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Total bookings today
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {totalBookingsToday}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">
                  Pending requests
                </p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {pendingRequests}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="outline"
                className="rounded-full border-border/80"
              >
                <Link href="/dashboard/availability">Availability</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          <Link
            href="/"
            className="underline decoration-primary/40 underline-offset-2"
          >
            ← Home
          </Link>
        </p>
      </div>
    );
  }

  const { data: patientProfile } = await supabase
    .from("profiles")
    .select("due_date, lmp_date")
    .eq("id", user.id)
    .single();

  const week = pregnancyWeekFromProfile(
    patientProfile?.due_date ?? null,
    patientProfile?.lmp_date ?? null
  );

  const now = new Date().toISOString();
  const { data: nextAppt } = await supabase
    .from("appointments")
    .select("id,start_time,appointment_type,status")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .gte("start_time", now)
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Your space
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profileRole?.full_name
            ? `Welcome back, ${profileRole.full_name}`
            : "We’re glad you’re here"}
        </p>
      </div>

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Your journey</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            A gentle view of where you are and what&apos;s typical at each stage.
          </p>
        </CardHeader>
        <CardContent>
          <JourneyProgress week={week} />
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Your next appointment</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            A quick snapshot of what&apos;s coming up.
          </p>
        </CardHeader>
        <CardContent>
          {!nextAppt ? (
            <p className="text-sm text-muted-foreground">
              Nothing scheduled yet. Book a visit when you&apos;re ready.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-foreground">{nextAppt.appointment_type}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextAppt.start_time).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <Button asChild variant="outline" className="w-fit rounded-full shrink-0">
                <Link href="/dashboard/appointments">View appointments</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <Link href="/dashboard/appointments">Book a visit</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-border/80">
          <Link href="/dashboard/health-profile">Health profile</Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="underline decoration-primary/40 underline-offset-2">
          ← Home
        </Link>
      </p>
    </div>
  );
}
