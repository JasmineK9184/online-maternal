"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  approveAppointment,
  archiveAppointment,
  rejectAppointment,
} from "@/app/actions/admin-appointments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type AdminAppointmentRow = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  patient_email: string | null;
  appointment_type: string;
  start_time: string;
  end_time: string;
  status: string;
  is_telehealth: boolean;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "pending") {
    return <Badge variant="warning">Pending</Badge>;
  }
  if (s === "scheduled") {
    return (
      <span className="inline-flex rounded-full border border-teal-200/80 bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-900">
        Approved
      </span>
    );
  }
  if (s === "cancelled") {
    return <Badge variant="destructive">Cancelled</Badge>;
  }
  if (s === "completed") {
    return <Badge variant="secondary">Completed</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function formatDateCol(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTimeCol(start: string, end: string) {
  const tf = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${tf.format(new Date(start))} – ${tf.format(new Date(end))}`;
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AppointmentsDataTable({
  rows,
  pendingActions,
  onRowSelect,
}: {
  rows: AdminAppointmentRow[];
  pendingActions: boolean;
  onRowSelect: (row: AdminAppointmentRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-[#FBF9F6]/90 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3.5">Patient name</th>
            <th className="px-4 py-3.5">Visit type</th>
            <th className="px-4 py-3.5">Date</th>
            <th className="px-4 py-3.5">Time</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              role="button"
              tabIndex={0}
              onClick={() => onRowSelect(row)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowSelect(row);
                }
              }}
              className="cursor-pointer border-b border-gray-100/90 last:border-0 hover:bg-[#FBF9F6]/40 focus-visible:bg-[#FBF9F6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4B7B7F]/25"
            >
              <td className="px-4 py-3 font-medium text-foreground">
                {row.patient_name?.trim() || "—"}
              </td>
              <td className="max-w-[200px] truncate px-4 py-3 text-foreground">
                {row.appointment_type}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatDateCol(row.start_time)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                {formatTimeCol(row.start_time, row.end_time)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td
                className="px-4 py-3 text-right"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {pendingActions && row.status === "pending" ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <form action={approveAppointment} className="inline">
                      <input type="hidden" name="appointmentId" value={row.id} />
                      <input type="hidden" name="returnTo" value="/dashboard/appointments" />
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-full bg-[#4B7B7F] px-4 text-white hover:bg-[#4B7B7F]/90"
                      >
                        Approve
                      </Button>
                    </form>
                    <form action={rejectAppointment} className="inline">
                      <input type="hidden" name="appointmentId" value={row.id} />
                      <input type="hidden" name="returnTo" value="/dashboard/appointments" />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      >
                        Reject
                      </Button>
                    </form>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SectionProps = {
  title: string;
  description: string;
  rows: AdminAppointmentRow[];
  pendingActions: boolean;
  emptyMessage: string;
  noSearchMatchesMessage: string;
  hasAnyRowsInDataset: boolean;
  onRowSelect: (row: AdminAppointmentRow) => void;
};

function AppointmentSection({
  title,
  description,
  rows,
  pendingActions,
  emptyMessage,
  noSearchMatchesMessage,
  hasAnyRowsInDataset,
  onRowSelect,
}: SectionProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-card">
        {rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {!hasAnyRowsInDataset ? emptyMessage : noSearchMatchesMessage}
          </p>
        ) : (
          <AppointmentsDataTable
            rows={rows}
            pendingActions={pendingActions}
            onRowSelect={onRowSelect}
          />
        )}
      </div>
    </section>
  );
}

type Props = {
  rows: AdminAppointmentRow[];
  actionError?: string | null;
};

function appointmentArchiveLabel(row: AdminAppointmentRow) {
  const visit = (row.appointment_type ?? "").trim() || "visit";
  const who = (row.patient_name ?? "").trim();
  return who ? `${visit} — ${who}` : visit;
}

export function AdminAppointmentsTable({ rows, actionError }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminAppointmentRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminAppointmentRow | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.patient_name ?? "").toLowerCase();
      return name.includes(q);
    });
  }, [rows, query]);

  const pendingRows = useMemo(
    () => filtered.filter((r) => r.status.toLowerCase() === "pending"),
    [filtered]
  );

  const historyRows = useMemo(() => {
    const rest = filtered.filter((r) => r.status.toLowerCase() !== "pending");
    return [...rest].sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }, [filtered]);

  const pendingCountAll = rows.filter((r) => r.status.toLowerCase() === "pending").length;
  const historyCountAll = rows.length - pendingCountAll;

  async function handleConfirmArchive() {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    const r = await archiveAppointment(archiveTarget.id);
    setArchiveBusy(false);
    if ("error" in r) {
      toast.error(r.error);
      setArchiveTarget(null);
      return;
    }
    toast.success("Appointment archived.");
    setArchiveTarget(null);
    setSelected(null);
    router.refresh();
  }

  return (
    <>
      <ConfirmModal
        open={archiveTarget != null}
        variant="archive"
        subjectName={archiveTarget ? appointmentArchiveLabel(archiveTarget) : ""}
        copy={{
          headline: "Archive this appointment?",
          subline:
            "Soft archive only: it disappears from patient and admin appointment lists. The row stays in your database for records.",
          confirmLabel: "Confirm archive",
        }}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleConfirmArchive}
        loading={archiveBusy}
      />

      <div className="space-y-10">
        {actionError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            {actionError}
          </div>
        ) : null}

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search by patient name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-2xl border-border/60 bg-white pl-10 shadow-sm"
            aria-label="Filter appointments by patient name"
          />
        </div>

        <AppointmentSection
          title="Pending requests"
          description="Appointments waiting for your approval or rejection."
          rows={pendingRows}
          pendingActions
          emptyMessage="No pending requests right now."
          noSearchMatchesMessage="No pending requests match this search."
          hasAnyRowsInDataset={pendingCountAll > 0}
          onRowSelect={setSelected}
        />

        <AppointmentSection
          title="Approved & history"
          description="Scheduled, completed, and cancelled visits (newest first)."
          rows={historyRows}
          pendingActions={false}
          emptyMessage="No approved or past appointments yet."
          noSearchMatchesMessage="No appointments in this list match your search."
          hasAnyRowsInDataset={historyCountAll > 0}
          onRowSelect={setSelected}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Appointment details</DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground">
                  {selected.appointment_type}
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </dt>
                  <dd className="mt-1">
                    <StatusBadge status={selected.status} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Patient
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {selected.patient_name?.trim() || "—"}
                  </dd>
                  {selected.patient_email?.trim() ? (
                    <dd className="text-xs text-muted-foreground">{selected.patient_email.trim()}</dd>
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
                <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Approve or reject from here or use the table actions.
                  </p>
                  <form action={approveAppointment} className="flex flex-col gap-2">
                    <input type="hidden" name="appointmentId" value={selected.id} />
                    <input type="hidden" name="returnTo" value="/dashboard/appointments" />
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-[#4B7B7F] text-white hover:bg-[#4B7B7F]/90"
                    >
                      Approve
                    </Button>
                  </form>
                  <form action={rejectAppointment}>
                    <input type="hidden" name="appointmentId" value={selected.id} />
                    <input type="hidden" name="returnTo" value="/dashboard/appointments" />
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    >
                      Reject
                    </Button>
                  </form>
                </div>
              ) : null}

              <div className="mt-6 border-t border-gray-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-200"
                  onClick={() => setArchiveTarget(selected)}
                >
                  Archive
                </Button>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Soft archive hides this visit from active lists. View and restore under Profile Settings →
                  Archived appointments.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
