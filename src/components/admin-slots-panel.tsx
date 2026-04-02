"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createAvailabilitySlot,
  deleteAvailabilitySlot,
  updateAvailabilitySlot,
} from "@/app/actions/admin-slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AdminSlotRow = {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
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

type Props = { initialSlots: AdminSlotRow[] };

export function AdminSlotsPanel({ initialSlots }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createLabel, setCreateLabel] = useState("");

  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editLabel, setEditLabel] = useState("");

  function beginEdit(row: AdminSlotRow) {
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
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    if (!window.confirm("Delete this slot? Bookings keep their times; slot link is cleared.")) {
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await deleteAvailabilitySlot({ id });
      if ("error" in res && res.error) {
        setMsg(typeof res.error === "string" ? res.error : "Could not delete");
        return;
      }
      if (editingId === id) setEditingId(null);
      router.refresh();
    });
  }

  function isBooked(row: AdminSlotRow) {
    return row.booked === true;
  }

  return (
    <div className="space-y-8">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Add slot</CardTitle>
          <p className="text-sm text-muted-foreground">
            Times use your browser&apos;s local timezone. Patients only see future slots that are
            still open.
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
                <Input
                  id="e-label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                />
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

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">All slots</CardTitle>
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
              {initialSlots.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-muted-foreground">
                    No slots yet. Create one above.
                  </td>
                </tr>
              )}
              {initialSlots.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(row.start_time).toLocaleString()}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(row.end_time).toLocaleString()}
                  </td>
                  <td className="p-3">{row.label ?? "—"}</td>
                  <td className="p-3">
                    {isBooked(row) ? (
                      <span className="text-amber-800 dark:text-amber-200">Booked</span>
                    ) : new Date(row.start_time) <= new Date() ? (
                      <span className="text-muted-foreground">Past</span>
                    ) : (
                      <span className="text-primary">Open</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => beginEdit(row)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => onDelete(row.id)}
                        disabled={pending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-destructive">{msg}</p>}
    </div>
  );
}
