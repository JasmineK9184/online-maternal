"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarClock, Clock3, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminMetricPatient = {
  id: string;
  full_name: string | null;
  phone: string | null;
  due_date: string | null;
  lmp_date: string | null;
};

export type AdminMetricAppointment = {
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

function formatDateYmd(value: string | null) {
  if (!value) return "—";
  const s = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return value;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatApptWindow(start: string, end: string) {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const dateStr = s.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const t0 = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const t1 = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${dateStr} · ${t0} – ${t1}`;
  } catch {
    return start;
  }
}

function MetricTriggerCard({
  label,
  value,
  icon: Icon,
  children,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition",
            "hover:border-[#4B7B7F]/40 hover:shadow-[0_10px_36px_rgb(0,0,0,0.06)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B7B7F] focus-visible:ring-offset-2"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-foreground">{value}</p>
              <p className="mt-2 text-xs text-muted-foreground">Click to view details</p>
            </div>
            <Icon className="h-6 w-6 shrink-0 text-[#4B7B7F]" strokeWidth={1.5} aria-hidden />
          </div>
        </button>
      </DialogTrigger>
      {children}
    </Dialog>
  );
}

export function AdminMetricCards({
  patients,
  todaysAppointments,
  pendingAppointments,
}: {
  patients: AdminMetricPatient[];
  todaysAppointments: AdminMetricAppointment[];
  pendingAppointments: AdminMetricAppointment[];
}) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricTriggerCard label="Active Patients" value={patients.length} icon={Users}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden gap-0 p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-4 text-left">
            <DialogTitle>Active patients</DialogTitle>
            <DialogDescription>
              Everyone registered with role patient ({patients.length} total).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto px-6 py-4">
            {patients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No patients yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {patients.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-foreground">
                      {(p.full_name ?? "").trim() || "Unnamed patient"}
                    </p>
                    <dl className="mt-1 grid gap-0.5 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>
                        <dt className="inline text-muted-foreground/80">Phone: </dt>
                        <dd className="inline">{p.phone?.trim() || "—"}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground/80">Due date: </dt>
                        <dd className="inline">{formatDateYmd(p.due_date)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="inline text-muted-foreground/80">LMP: </dt>
                        <dd className="inline">{formatDateYmd(p.lmp_date)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </MetricTriggerCard>

      <MetricTriggerCard
        label="Today's Appointments"
        value={todaysAppointments.length}
        icon={CalendarClock}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden gap-0 p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-4 text-left">
            <DialogTitle>Today&apos;s appointments</DialogTitle>
            <DialogDescription>
              Scheduled for today, excluding cancelled ({todaysAppointments.length} total).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto px-6 py-4">
            {todaysAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments on the calendar for today.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {todaysAppointments.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-foreground">
                      {(a.patient_name ?? "").trim() || "Patient"}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatApptWindow(a.start_time, a.end_time)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.appointment_type}
                      {a.is_telehealth ? " · Telehealth" : ""}
                      <span className="text-muted-foreground/80"> · {a.status}</span>
                    </p>
                    {a.patient_email ? (
                      <p className="mt-1 text-xs text-muted-foreground">{a.patient_email}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </MetricTriggerCard>

      <MetricTriggerCard label="Pending Bookings" value={pendingAppointments.length} icon={Clock3}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden gap-0 p-0">
          <DialogHeader className="border-b border-gray-100 px-6 py-4 text-left">
            <DialogTitle>Pending bookings</DialogTitle>
            <DialogDescription>
              Awaiting approval ({pendingAppointments.length} total).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,520px)] overflow-y-auto px-6 py-4">
            {pendingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {pendingAppointments.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-medium text-foreground">
                      {(a.patient_name ?? "").trim() || "Patient"}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatApptWindow(a.start_time, a.end_time)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.appointment_type}
                      {a.is_telehealth ? " · Telehealth" : ""}
                    </p>
                    {a.patient_email ? (
                      <p className="mt-1 text-xs text-muted-foreground">{a.patient_email}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </MetricTriggerCard>
    </div>
  );
}
