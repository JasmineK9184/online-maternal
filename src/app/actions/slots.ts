"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isMissingArchivedAtSchemaError } from "@/lib/active-patients-query";
import { createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mail";

function getOrdinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatLongDate(d: Date) {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d);
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(d);
  return `${weekday}, ${month} ${getOrdinal(d.getDate())}`;
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}

export type OpenSlot = {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
};

export async function getOpenSlots(): Promise<{ slots: OpenSlot[]; error?: string }> {
  const supabase = await createClient();
  const res = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time, label, archived_at")
    .order("start_time", { ascending: true });

  if (res.error && isMissingArchivedAtSchemaError(res.error)) {
    const fb = await supabase
      .from("availability_slots")
      .select("id, start_time, end_time, label")
      .order("start_time", { ascending: true });
    if (fb.error) return { slots: [], error: fb.error.message };
    return { slots: (fb.data ?? []) as OpenSlot[] };
  }

  if (res.error) return { slots: [], error: res.error.message };
  const rows = (res.data ?? []).filter((r) => !(r as { archived_at?: string | null }).archived_at);
  return { slots: rows as OpenSlot[] };
}

const bookSlotSchema = z.object({
  slotId: z.string().uuid(),
  appointmentType: z.string().min(1),
  telehealth: z.boolean(),
});

const requestAppointmentSchema = z.object({
  appointmentType: z.string().min(1),
  telehealth: z.boolean(),
  startIso: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(30),
});

export async function requestAppointmentBooking(
  input: z.infer<typeof requestAppointmentSchema>
) {
  const parsed = requestAppointmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const start = new Date(parsed.data.startIso);
  if (Number.isNaN(start.getTime())) {
    return { error: "Invalid date or time." };
  }

  const durationMs = parsed.data.durationMinutes * 60_000;
  const end = new Date(start.getTime() + durationMs);
  if (end <= start) return { error: "Invalid visit length." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (start.getTime() < Date.now() - 60_000) {
    return { error: "Please choose a date and time in the future." };
  }

  const { data: overlap } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .limit(1)
    .maybeSingle();

  if (overlap) {
    return { error: "You already have an appointment overlapping this time." };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("appointments")
    .insert({
      patient_id: user.id,
      slot_id: null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "pending",
      appointment_type: parsed.data.appointmentType.trim(),
      is_telehealth: parsed.data.telehealth,
      google_event_id: null,
      patient_email: user.email,
    })
    .select("id");

  if (insertErr) {
    return { error: insertErr.message };
  }

  const insertedId = inserted?.[0]?.id ?? null;
  if (!insertedId) {
    return { error: "Request created, but confirmation could not be tracked." };
  }

  const hasGmail =
    Boolean(process.env.GMAIL_USER?.trim()) && Boolean(process.env.GMAIL_APP_PASSWORD?.trim());

  if (!hasGmail) {
    console.warn(
      "[mail] Booking saved but email skipped: set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local and restart dev."
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    return { ok: true as const, emailSent: false, emailIssue: "missing_env" as const };
  }

  try {
    const displayName = (profile?.full_name ?? "").trim() || "there";
    const dateFormatted = formatLongDate(start);
    const timeFormatted = formatTime(start);
    const visitType = parsed.data.appointmentType.trim();
    const body = [
      `Good morning ${displayName}, your booking for ${visitType} on ${dateFormatted} at ${timeFormatted} was successful.`,
      "",
      "We have received your request and will email you again once it has been approved by the clinic.",
      "",
      "Thank you,",
      "MaternalCare",
    ].join("\n");
    await sendMail({
      to: user.email,
      subject: "MaternalCare — booking received",
      text: body,
    });
    await supabase
      .from("appointments")
      .update({ booking_confirmation_sent_at: new Date().toISOString() })
      .eq("id", insertedId);
  } catch (e) {
    console.error("[mail] Booking notification email failed:", e);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    return { ok: true as const, emailSent: false, emailIssue: "smtp_failed" as const };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  return { ok: true as const, emailSent: true };
}

export async function bookSlotAppointment(input: z.infer<typeof bookSlotSchema>) {
  const parsed = bookSlotSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: slot, error: slotErr } = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time, archived_at")
    .eq("id", parsed.data.slotId)
    .maybeSingle();

  if (slotErr || !slot) return { error: "This time slot is no longer available." };
  if ((slot as { archived_at?: string | null }).archived_at) {
    return { error: "This time slot is no longer available." };
  }

  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);
  if (end <= start) return { error: "Invalid slot times." };

  const { data: overlap } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .is("archived_at", null)
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .limit(1)
    .maybeSingle();

  if (overlap) return { error: "You already have an appointment overlapping this time." };

  const { data: inserted, error: insertErr } = await supabase
    .from("appointments")
    .insert({
      patient_id: user.id,
      slot_id: parsed.data.slotId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "pending",
      appointment_type: parsed.data.appointmentType,
      is_telehealth: parsed.data.telehealth,
      google_event_id: null,
      patient_email: user.email,
    })
    .select("id");

  if (insertErr) {
    const code = "code" in insertErr ? String((insertErr as { code?: string }).code) : "";
    if (code === "23505" || insertErr.message?.includes("duplicate")) {
      return { error: "Someone just booked this slot. Please pick another time." };
    }
    return { error: insertErr.message };
  }

  const insertedId = inserted?.[0]?.id ?? null;
  if (!insertedId) {
    return { error: "Booking created, but confirmation could not be tracked." };
  }

  const hasGmail =
    Boolean(process.env.GMAIL_USER?.trim()) && Boolean(process.env.GMAIL_APP_PASSWORD?.trim());

  if (!hasGmail) {
    console.warn(
      "[mail] Booking saved but email skipped: set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local and restart dev."
    );
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    return { ok: true as const, emailSent: false, emailIssue: "missing_env" as const };
  }

  try {
    const displayName = (profile?.full_name ?? "").trim() || "there";
    const dateFormatted = formatLongDate(start);
    const timeFormatted = formatTime(start);
    const visitType = parsed.data.appointmentType.trim();
    const body = [
      `Good morning ${displayName}, your booking for ${visitType} on ${dateFormatted} at ${timeFormatted} was successful.`,
      "",
      "We have received your request and will email you again once it has been approved by the clinic.",
      "",
      "Thank you,",
      "MaternalCare",
    ].join("\n");
    await sendMail({
      to: user.email,
      subject: "MaternalCare — booking received",
      text: body,
    });
    await supabase
      .from("appointments")
      .update({ booking_confirmation_sent_at: new Date().toISOString() })
      .eq("id", insertedId);
  } catch (e) {
    console.error("[mail] Booking notification email failed:", e);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/appointments");
    return { ok: true as const, emailSent: false, emailIssue: "smtp_failed" as const };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  return { ok: true as const, emailSent: true };
}
