"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { restoreUser } from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export type ArchivedUserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  archived_at: string;
  email: string | null;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function displayName(row: ArchivedUserRow) {
  const n = (row.full_name ?? "").trim();
  return n || "this user";
}

export function ArchivedUsersTable({ rows, isAdmin }: { rows: ArchivedUserRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoreRow, setRestoreRow] = useState<ArchivedUserRow | null>(null);

  async function handleConfirmRestore() {
    if (!restoreRow) return;
    setBusyId(restoreRow.id);
    setError(null);
    const r = await restoreUser(restoreRow.id);
    setBusyId(null);
    if ("error" in r) {
      setError(r.error);
      setRestoreRow(null);
      return;
    }
    toast.success(`${displayName(restoreRow)} has been restored.`);
    setRestoreRow(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No archived users.</p>;
  }

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={restoreRow != null}
        variant="restore"
        subjectName={restoreRow ? displayName(restoreRow) : ""}
        onCancel={() => setRestoreRow(null)}
        onConfirm={handleConfirmRestore}
        loading={restoreRow != null && busyId === restoreRow.id}
      />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Archived</th>
              {isAdmin ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3 font-medium text-foreground">
                  {(r.full_name ?? "").trim() || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.email?.trim() || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatWhen(r.archived_at)}</td>
                {isAdmin ? (
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="rounded-full"
                      disabled={busyId === r.id}
                      onClick={() => setRestoreRow(r)}
                    >
                      Restore
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
