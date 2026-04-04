import Link from "next/link";
import {
  AdminMetricCards,
  type AdminMetricAppointment,
  type AdminMetricPatient,
} from "@/components/dashboard/admin-metric-cards";
import { AdminRecentActivityTable } from "@/components/dashboard/admin-recent-activity-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings2 } from "lucide-react";

export type AdminActivityRow = {
  id: string;
  created_at: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  status: string;
  patient_name: string | null;
  patient_email: string | null;
  is_telehealth: boolean;
};

type Props = {
  adminName: string | null;
  patients: AdminMetricPatient[];
  todaysAppointments: AdminMetricAppointment[];
  pendingAppointments: AdminMetricAppointment[];
  availabilityHref: string;
  activity: AdminActivityRow[];
};

export function AdminControlTower({
  adminName,
  patients,
  todaysAppointments,
  pendingAppointments,
  availabilityHref,
  activity,
}: Props) {
  const displayName = (adminName ?? "").trim();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Clinic Overview
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {displayName ? `Welcome back, ${displayName}` : "Welcome back, Admin"}
        </p>
      </header>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-8">
        <h2 className="font-serif text-xl font-semibold text-foreground sm:text-2xl">Admin Metrics</h2>
        <p className="mt-1 text-sm font-medium text-muted-foreground">
          High-level clinic summary at a glance
        </p>
        <AdminMetricCards
          patients={patients}
          todaysAppointments={todaysAppointments}
          pendingAppointments={pendingAppointments}
        />
      </section>

      <Card className="border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CardHeader className="flex flex-col gap-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-serif text-2xl">Recent activity</CardTitle>
            <p className="text-sm font-medium text-muted-foreground">
              Latest bookings and status changes (newest first)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-full border-gray-200">
              <Link href={availabilityHref}>
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Availability
                </span>
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <AdminRecentActivityTable activity={activity} />
        </CardContent>
      </Card>
    </div>
  );
}
