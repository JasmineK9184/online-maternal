"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { restoreAppointment } from "@/app/actions/admin-appointments";
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

export type ArchivedAppointmentRow = {
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
  archived_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "pending") return <Badge variant="warning">Pending</Badge>;
  if (s === "scheduled") {
    return (
      <span className="inline-flex rounded-full border border-teal-200/80 bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-900">
        Approved
      </span>
    );
  }
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  if (s === "completed") return <Badge variant="secondary">Completed</Badge>;
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

function restoreSubject(row: ArchivedAppointmentRow) {
  const visit = (row.appointment_type ?? "").trim() || "visit";
  const who = (row.patient_name ?? "").trim();
  return who ? `${visit} — ${who}` : visit;
}

type Props = { rows: ArchivedAppointmentRow[] };

export function AdminArchivedAppointmentsTable({ rows }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ArchivedAppointmentRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<ArchivedAppointmentRow | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.patient_name ?? "").toLowerCase().includes(q));
  }, [rows, query]);

  async function handleConfirmRestore() {
    if (!restoreTarget) return;
    setRestoreBusy(true);
    setError(null);
    const r = await restoreAppointment(restoreTarget.id);
    setRestoreBusy(false);
    if ("error" in r) {
      setError(r.error);
      setRestoreTarget(null);
      return;
    }
    toast.success("Appointment restored to active lists.");
    setRestoreTarget(null);
    setSelected(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No archived appointments.</p>;
  }

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={restoreTarget != null}
        variant="restore"
        subjectName={restoreTarget ? restoreSubject(restoreTarget) : ""}
        copy={{
          headline: "Restore this appointment?",
          subline:
            "It will appear again on patient and admin appointment lists, availability, and reminders where applicable.",
          confirmLabel: "Confirm restore",
        }}
        onCancel={() => setRestoreTarget(null)}
        onConfirm={handleConfirmRestore}
        loading={restoreBusy}
      />

      <Dialog open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Archived appointment</DialogTitle>
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
                  <dd className="mt-0.5 text-foreground">{selected.patient_name?.trim() || "—"}</dd>
                  {selected.patient_email?.trim() ? (
                    <dd className="text-xs text-muted-foreground">{selected.patient_email.trim()}</dd>
                  ) : null}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Archived
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDt(selected.archived_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Visit
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDt(selected.start_time)}</dd>
                  <dd className="text-xs text-muted-foreground">through {formatDt(selected.end_time)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Telehealth
                  </dt>
                  <dd className="mt-0.5 text-foreground">
                    {selected.is_telehealth ? "Yes" : "No — in person"}
                  </dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-gray-100 pt-4">
                <Button
                  type="button"
                  className="w-full rounded-full bg-[#4B7B7F] text-white hover:bg-[#4B7B7F]/90"
                  onClick={() => setRestoreTarget(selected)}
                >
                  Restore
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search archived by patient name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-2xl border-border/60 bg-white pl-10 shadow-sm"
          aria-label="Filter archived appointments by patient name"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#FBF9F6]/90 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3.5">Patient name</th>
                <th className="px-4 py-3.5">Visit type</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Archived</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No archived appointments match this search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
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
                    className="cursor-pointer border-b border-gray-100/90 last:border-0 hover:bg-[#FBF9F6]/40 focus-visible:bg-[#FBF9F6]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4B7B7F]/25"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.patient_name?.trim() || "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-3">{row.appointment_type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateCol(row.start_time)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatTimeCol(row.start_time, row.end_time)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDt(row.archived_at)}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        className="rounded-full bg-[#4B7B7F] px-4 text-white hover:bg-[#4B7B7F]/90"
                        size="sm"
                        onClick={() => setRestoreTarget(row)}
                      >
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
