"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveAvailabilitySlot,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  restoreAvailabilitySlot,
  updateAvailabilitySlot,
} from "@/app/actions/admin-slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmModal, type ConfirmModalCopy } from "@/components/ui/confirm-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminSlotRow = {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
  archived_at?: string | null;
  /** True when a non-cancelled appointment references this slot */
  booked?: boolean;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${y}-${m}-${day}T${h}:${min}`;
}

function fromLocalInputValue(local: string) {
  return new Date(local).toISOString();
}

type DialogState =
  | { kind: "archive"; row: AdminSlotRow }
  | { kind: "delete"; row: AdminSlotRow }
  | { kind: "restore"; row: AdminSlotRow };

const SLOT_ARCHIVE_COPY: ConfirmModalCopy = {
  headline: "Archive this slot?",
  subline:
    "It will be hidden from patients (soft archive). Existing bookings keep their times. You can restore the slot anytime from the Archived slots list.",
  confirmLabel: "Confirm Archive",
};

const SLOT_DELETE_COPY: ConfirmModalCopy = {
  headline: "Delete this slot permanently?",
  subline:
    "This cannot be undone. Appointment records remain; the link to this slot is cleared (same as before).",
  confirmLabel: "Permanent Delete",
};

const SLOT_RESTORE_COPY: ConfirmModalCopy = {
  headline: "Restore this slot?",
  subline:
    "Patients can see and book this time again if it is still in the future and not already booked.",
  confirmLabel: "Confirm Restore",
};

type Props = { initialSlots: AdminSlotRow[] };

export function AdminSlotsPanel({ initialSlots }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createLabel, setCreateLabel] = useState("");

  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLabel, setEditLabel] = useState("");

  const activeSlots = initialSlots.filter((s) => !s.archived_at);
  const archivedSlots = initialSlots.filter((s) => Boolean(s.archived_at));

  function beginEdit(row: AdminSlotRow) {
    if (row.archived_at) return;
    setEditingId(row.id);
    setEditStart(toLocalInputValue(row.start_time));
    setEditEnd(toLocalInputValue(row.end_time));
    setEditLabel(row.label ?? "");
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!createStart || !createEnd) {
      setMsg("Start and end are required.");
      return;
    }
    startTransition(async () => {
      const res = await createAvailabilitySlot({
        startIso: fromLocalInputValue(createStart),
        endIso: fromLocalInputValue(createEnd),
        label: createLabel || null,
      });
      if ("error" in res && res.error) {
        setMsg(typeof res.error === "string" ? res.error : "Could not create slot");
        return;
      }
      setCreateStart("");
      setCreateEnd("");
      setCreateLabel("");
      toast.success("Slot created.");
      router.refresh();
    });
  }

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updateAvailabilitySlot({
        id: editingId,
        startIso: fromLocalInputValue(editStart),
        endIso: fromLocalInputValue(editEnd),
        label: editLabel || null,
      });
      if ("error" in res && res.error) {
        setMsg(typeof res.error === "string" ? res.error : "Could not update");
        return;
      }
      setEditingId(null);
      toast.success("Slot updated.");
      router.refresh();
    });
  }

  async function handleDialogConfirm() {
    if (!dialog) return;
    setDialogBusy(true);
    setMsg(null);
    const { kind, row } = dialog;
    let res:
      | { ok: true }
      | { error: string | Record<string, string[] | undefined> }
      | undefined;
    if (kind === "archive") res = await archiveAvailabilitySlot({ id: row.id });
    else if (kind === "restore") res = await restoreAvailabilitySlot({ id: row.id });
    else res = await deleteAvailabilitySlot({ id: row.id });

    setDialogBusy(false);
    if (res && "error" in res && res.error) {
      setMsg(typeof res.error === "string" ? res.error : "Could not complete action");
      setDialog(null);
      return;
    }
    if (kind === "archive") toast.success("Slot archived (hidden from booking).");
    else if (kind === "restore") toast.success("Slot restored.");
    else toast.success("Slot deleted permanently.");
    if (editingId === row.id) setEditingId(null);
    setDialog(null);
    router.refresh();
  }

  function isBooked(row: AdminSlotRow) {
    return row.booked === true;
  }

  const dialogVariant = dialog?.kind === "delete" ? "delete" : dialog?.kind === "restore" ? "restore" : "archive";
  const dialogCopy =
    dialog?.kind === "archive"
      ? SLOT_ARCHIVE_COPY
      : dialog?.kind === "delete"
        ? SLOT_DELETE_COPY
        : dialog?.kind === "restore"
          ? SLOT_RESTORE_COPY
          : undefined;

  function renderSlotTable(title: string, rows: AdminSlotRow[], options: { archived: boolean }) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="p-3 font-medium">Start</th>
                <th className="p-3 font-medium">End</th>
                <th className="p-3 font-medium">Label</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-muted-foreground">
                    {options.archived ? "No archived slots." : "No slots yet. Create one above."}
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="p-3 whitespace-nowrap">{new Date(row.start_time).toLocaleString()}</td>
                  <td className="p-3 whitespace-nowrap">{new Date(row.end_time).toLocaleString()}</td>
                  <td className="p-3">{row.label ?? "—"}</td>
                  <td className="p-3">
                    {options.archived ? (
                      <span className="text-muted-foreground">Archived</span>
                    ) : isBooked(row) ? (
                      <span className="text-amber-800 dark:text-amber-200">Booked</span>
                    ) : new Date(row.start_time) <= new Date() ? (
                      <span className="text-muted-foreground">Past</span>
                    ) : (
                      <span className="text-primary">Open</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {!options.archived ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => beginEdit(row)}
                            disabled={pending}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-200 text-amber-900 hover:bg-amber-50"
                            onClick={() => setDialog({ kind: "archive", row })}
                            disabled={pending}
                          >
                            Archive
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDialog({ kind: "delete", row })}
                            disabled={pending}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="rounded-full bg-[#4B7B7F] hover:bg-[#4B7B7F]/90"
                            onClick={() => setDialog({ kind: "restore", row })}
                            disabled={pending}
                          >
                            Restore
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDialog({ kind: "delete", row })}
                            disabled={pending}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <ConfirmModal
        open={dialog != null}
        variant={dialogVariant}
        subjectName=""
        copy={dialogCopy}
        onCancel={() => !dialogBusy && setDialog(null)}
        onConfirm={handleDialogConfirm}
        loading={dialogBusy}
      />

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Add slot</CardTitle>
          <p className="text-sm text-muted-foreground">
            Times use your browser&apos;s local timezone. Patients only see future slots that are still open
            and not archived.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="c-start">Start</Label>
              <Input
                id="c-start"
                type="datetime-local"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-end">End</Label>
              <Input
                id="c-end"
                type="datetime-local"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="c-label">Label (optional)</Label>
              <Input
                id="c-label"
                value={createLabel}
                onChange={(e) => setCreateLabel(e.target.value)}
                placeholder="e.g. Dr. Lee — prenatal"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={pending}>
                Create slot
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editingId && (
        <Card className="border-primary/30 bg-accent/30">
          <CardHeader>
            <CardTitle className="text-lg">Edit slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onUpdate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="e-start">Start</Label>
                <Input
                  id="e-start"
                  type="datetime-local"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-end">End</Label>
                <Input
                  id="e-end"
                  type="datetime-local"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="e-label">Label</Label>
                <Input id="e-label" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
                <Button type="submit" disabled={pending}>
                  Save changes
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {renderSlotTable("Active slots", activeSlots, { archived: false })}
      {renderSlotTable("Archived slots", archivedSlots, { archived: true })}

      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
