"use client";

import { useState } from "react";
import { approveAppointment } from "@/app/actions/admin-appointments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AdminActivityRow } from "@/components/dashboard/admin-control-tower";

function formatDt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type Props = {
  activity: AdminActivityRow[];
};

export function AdminRecentActivityTable({ activity }: Props) {
  const [selected, setSelected] = useState<AdminActivityRow | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-[#FBF9F6]/80 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Appointment</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No appointment activity yet.
                </td>
              </tr>
            ) : (
              activity.map((row) => (
                <tr
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(row);
                    }
                  }}
                  className="cursor-pointer border-b border-gray-100/90 last:border-0 hover:bg-[#FBF9F6]/50 focus-visible:bg-[#FBF9F6]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B7B7F]/30"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {formatDt(row.created_at)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 font-medium text-foreground">
                    {row.appointment_type}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    <span className="block truncate font-medium text-foreground">
                      {row.patient_name?.trim() || "—"}
                    </span>
                    {row.patient_email ? (
                      <span className="block truncate text-xs">{row.patient_email}</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                    {formatDt(row.start_time)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        row.status === "pending"
                          ? "bg-[#E29578]/15 text-[#c26a4a]"
                          : row.status === "scheduled"
                            ? "bg-[#99B898]/25 text-[#3d5c3c]"
                            : row.status === "cancelled"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment</DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground">
                  {selected.appointment_type}
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-0.5 capitalize text-foreground">{selected.status}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Patient
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {selected.patient_name?.trim() || "—"}
                  </dd>
                  {selected.patient_email ? (
                    <dd className="text-xs text-muted-foreground">{selected.patient_email}</dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Request submitted
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDt(selected.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visit start
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDt(selected.start_time)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visit end
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDt(selected.end_time)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Telehealth
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {selected.is_telehealth ? "Yes (Meet when available)" : "No — in person"}
                  </dd>
                </div>
              </dl>

              {selected.status === "pending" ? (
                <form action={approveAppointment} className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4">
                  <input type="hidden" name="appointmentId" value={selected.id} />
                  <input type="hidden" name="returnTo" value="/dashboard" />
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-[#4B7B7F] text-white hover:bg-[#4B7B7F]/90"
                  >
                    Approve appointment
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Approves the visit and notifies the patient when email is configured.
                  </p>
                </form>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Only <span className="font-medium text-foreground">pending</span> requests can be
                  approved from here. Use Availability for full calendar tools.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
