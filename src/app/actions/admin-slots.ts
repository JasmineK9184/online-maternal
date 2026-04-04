"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Forbidden" as const, supabase: null };
  }
  return { error: null, supabase };
}

const slotObject = z.object({
  startIso: z.string().min(1),
  endIso: z.string().min(1),
  label: z.string().optional().nullable(),
});

const timeOrderRefine = {
  refine: (d: z.infer<typeof slotObject>) =>
    new Date(d.endIso).getTime() > new Date(d.startIso).getTime(),
  message: "End time must be after start time" as const,
};

const slotFields = slotObject.refine(timeOrderRefine.refine, timeOrderRefine.message);

const updateSchema = slotObject
  .extend({ id: z.string().uuid() })
  .refine(timeOrderRefine.refine, timeOrderRefine.message);

export async function createAvailabilitySlot(input: z.infer<typeof slotFields>) {
  const parsed = slotFields.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { error } = await gate.supabase.from("availability_slots").insert({
    start_time: parsed.data.startIso,
    end_time: parsed.data.endIso,
    label: parsed.data.label?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function updateAvailabilitySlot(input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { error } = await gate.supabase
    .from("availability_slots")
    .update({
      start_time: parsed.data.startIso,
      end_time: parsed.data.endIso,
      label: parsed.data.label?.trim() || null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const idOnlySchema = z.object({ id: z.string().uuid() });

/** Soft-hide slot from patient booking; existing appointments unchanged. */
export async function archiveAvailabilitySlot(input: z.infer<typeof idOnlySchema>) {
  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { error } = await gate.supabase
    .from("availability_slots")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function restoreAvailabilitySlot(input: z.infer<typeof idOnlySchema>) {
  const parsed = idOnlySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { error } = await gate.supabase
    .from("availability_slots")
    .update({ archived_at: null })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const deleteSchema = z.object({ id: z.string().uuid() });

export async function deleteAvailabilitySlot(input: z.infer<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { error } = await gate.supabase
    .from("availability_slots")
    .delete()
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
