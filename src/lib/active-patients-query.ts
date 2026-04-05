import type { SupabaseClient } from "@supabase/supabase-js";

/** True when PostgREST/Supabase rejects a query because `archived_at` is not on `profiles` yet. */
export function isMissingArchivedAtSchemaError(err: { message?: string } | null | undefined) {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("archived_at") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
}

type SupabaseMaybeResult<T> = { data: T | null; error: { message?: string } | null };

/**
 * For queries that use `.is("archived_at", null)` on `appointments` (or similar).
 * If the column was never migrated, PostgREST errors; retry without the filter so lists still load.
 */
export async function withArchivedAtFilterFallback<T>(
  run: (filterArchivedRows: boolean) => Promise<SupabaseMaybeResult<T>>
): Promise<SupabaseMaybeResult<T>> {
  let res = await run(true);
  if (res.error && isMissingArchivedAtSchemaError(res.error)) {
    res = await run(false);
  }
  return res;
}

/**
 * Fetches one appointment row including `archived_at` when the column exists.
 * If `appointments.archived_at` was never migrated, retries without it (treat as not archived).
 */
export async function selectAppointmentRowWithArchiveFallback<
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  supabase: SupabaseClient,
  appointmentId: string,
  selectWithArchivedAt: string,
  selectWithoutArchivedAt: string
): Promise<{ data: (T & { archived_at?: string | null }) | null; error: { message?: string } | null }> {
  let res = await supabase
    .from("appointments")
    .select(selectWithArchivedAt)
    .eq("id", appointmentId)
    .single();

  if (res.error && isMissingArchivedAtSchemaError(res.error)) {
    const fb = await supabase
      .from("appointments")
      .select(selectWithoutArchivedAt)
      .eq("id", appointmentId)
      .single();
    if (fb.error) return { data: null, error: fb.error };
    const row = fb.data as unknown as (T & { archived_at?: string | null }) | null;
    return {
      data: row != null ? { ...row, archived_at: null } : null,
      error: null,
    };
  }

  return {
    data: res.data as (T & { archived_at?: string | null }) | null,
    error: res.error,
  };
}

/**
 * Lists patient profiles excluding archived rows when `archived_at` exists.
 * If the column is not migrated yet, falls back to all patients (no filter).
 */
export async function fetchActivePatientProfiles<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  selectWithoutArchive: string
): Promise<T[]> {
  const trimmed = selectWithoutArchive.trim();
  const withArchive = trimmed.includes("archived_at")
    ? trimmed
    : `${trimmed.replace(/,\s*$/, "")}, archived_at`;

  const res = await supabase
    .from("profiles")
    .select(withArchive)
    .eq("role", "patient")
    .order("full_name", { ascending: true, nullsFirst: false });

  if (res.error && isMissingArchivedAtSchemaError(res.error)) {
    const fb = await supabase
      .from("profiles")
      .select(trimmed)
      .eq("role", "patient")
      .order("full_name", { ascending: true, nullsFirst: false });
    return (fb.data ?? []) as unknown as T[];
  }

  if (res.error) return [];
  return (res.data ?? []).filter((row) => !(row as { archived_at?: string | null }).archived_at) as unknown as T[];
}
