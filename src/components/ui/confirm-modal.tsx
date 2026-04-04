"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Archive, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

export type ConfirmModalVariant = "archive" | "delete" | "restore";

export type ConfirmModalCopy = {
  headline: string;
  subline: string;
  confirmLabel: string;
};

type Props = {
  open: boolean;
  variant: ConfirmModalVariant;
  /** Display name for copy when `copy` is not set, e.g. "Julianne" */
  subjectName: string;
  /** When set, overrides headline/subline/confirm (e.g. slot actions). */
  copy?: ConfirmModalCopy;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

const BRAND_TEAL = "#4B7B7F";
const SOFT_RED = "#C45C52";

export function ConfirmModal({
  open,
  variant,
  subjectName,
  copy,
  onCancel,
  onConfirm,
  loading = false,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, loading]);

  if (!mounted) return null;

  const headline = copy?.headline
    ? copy.headline
    : variant === "archive"
      ? `Archive ${subjectName}?`
      : variant === "delete"
        ? `Delete ${subjectName}?`
        : `Restore ${subjectName}?`;

  const subline = copy?.subline
    ? copy.subline
    : variant === "archive"
      ? "Soft archive only: they will be signed out and moved to the inactive list. You can restore them anytime from Profile Settings → Archived users."
      : variant === "delete"
        ? "This action is permanent and cannot be undone."
        : "They will be able to sign in again.";

  const confirmLabel =
    copy?.confirmLabel ??
    (variant === "archive"
      ? "Confirm Archive"
      : variant === "delete"
        ? "Permanent Delete"
        : "Confirm Restore");

  const node = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          role="presentation"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={loading ? undefined : onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-headline"
            className="w-full max-w-md rounded-3xl border border-gray-200/90 bg-white p-8 shadow-[0_24px_80px_rgb(0,0,0,0.12)]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              {variant === "archive" ? (
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"
                  aria-hidden
                >
                  <Archive className="h-7 w-7" strokeWidth={1.5} />
                </div>
              ) : variant === "delete" ? (
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100"
                  aria-hidden
                >
                  <AlertTriangle className="h-7 w-7 text-[#C45C52]" strokeWidth={1.5} />
                </div>
              ) : (
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-[#4B7B7F]"
                  aria-hidden
                >
                  <RotateCcw className="h-7 w-7" strokeWidth={1.5} />
                </div>
              )}

              <h2
                id="confirm-modal-headline"
                className="font-display text-2xl font-semibold tracking-tight text-foreground"
              >
                {headline}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subline}</p>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-gray-200"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              {variant === "delete" ? (
                <Button
                  type="button"
                  className="rounded-full border-0 text-white shadow-sm disabled:opacity-60"
                  style={{ backgroundColor: SOFT_RED }}
                  onClick={() => void onConfirm()}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Working…
                    </span>
                  ) : (
                    confirmLabel
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-full border-0 text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: BRAND_TEAL }}
                  onClick={() => void onConfirm()}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Working…
                    </span>
                  ) : (
                    confirmLabel
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
