"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { archiveUser } from "@/app/actions/admin-users";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  due_date: string | null;
  email: string | null;
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

function displayName(row: AdminUserRow) {
  const n = (row.full_name ?? "").trim();
  return n || "this user";
}

export function AdminUsersTable({ rows, isAdmin }: { rows: AdminUserRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveRow, setArchiveRow] = useState<AdminUserRow | null>(null);
  const [detailRow, setDetailRow] = useState<AdminUserRow | null>(null);

  async function handleConfirmArchive() {
    if (!archiveRow) return;
    setBusyId(archiveRow.id);
    setError(null);
    const r = await archiveUser(archiveRow.id);
    setBusyId(null);
    if ("error" in r) {
      setError(r.error);
      setArchiveRow(null);
      return;
    }
    toast.success(`${displayName(archiveRow)} has been moved to archives.`);
    setArchiveRow(null);
    setDetailRow(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No active patients.</p>;
  }

  return (
    <div className="space-y-4">
      <ConfirmModal
        open={archiveRow != null}
        variant="archive"
        subjectName={archiveRow ? displayName(archiveRow) : ""}
        onCancel={() => setArchiveRow(null)}
        onConfirm={handleConfirmArchive}
        loading={archiveRow != null && busyId === archiveRow.id}
      />

      <Dialog open={detailRow != null} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-w-md">
          {detailRow && (
            <>
              <DialogHeader>
                <DialogTitle>Patient details</DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground">
                  {(detailRow.full_name ?? "").trim() || "—"}
                </DialogDescription>
              </DialogHeader>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-0.5 text-foreground">{detailRow.email?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Phone
                  </dt>
                  <dd className="mt-0.5 text-foreground">{detailRow.phone?.trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Due date
                  </dt>
                  <dd className="mt-0.5 text-foreground">{formatDateYmd(detailRow.due_date)}</dd>
                </div>
              </dl>
              {isAdmin ? (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full border-gray-200"
                    disabled={busyId === detailRow.id}
                    onClick={() => setArchiveRow(detailRow)}
                  >
                    Archive
                  </Button>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Active patients only. Archive is a soft deactivation (sign-out + inactive list);
                    restore anytime from Profile Settings → Archived users.
                  </p>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Due date</th>
              {isAdmin ? <th className="px-4 py-3 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <tr
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailRow(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailRow(r);
                  }
                }}
                className="align-top cursor-pointer hover:bg-[#FBF9F6]/50 focus-visible:bg-[#FBF9F6]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4B7B7F]/25"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {(r.full_name ?? "").trim() || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.email?.trim() || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.phone?.trim() || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateYmd(r.due_date)}</td>
                {isAdmin ? (
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={busyId === r.id}
                      onClick={() => setArchiveRow(r)}
                    >
                      Archive
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
