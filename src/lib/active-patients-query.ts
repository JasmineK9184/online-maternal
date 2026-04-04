import type { SupabaseClient } from "@supabase/supabase-js";

/** True when PostgREST/Supabase rejects a query because `archived_at` is not on `profiles` yet. */
export function isMissingArchivedAtSchemaError(err: { message?: string } | null | undefined) {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("archived_at") &&
    (m.includes("does not exist") || m.includes("schema cache") || m.includes("could not find"))
  );
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
    return (fb.data ?? []) as T[];
  }

  if (res.error) return [];
  return (res.data ?? []).filter((row) => !(row as { archived_at?: string | null }).archived_at) as T[];
}
