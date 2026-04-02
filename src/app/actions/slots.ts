"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { decryptRefreshToken } from "@/lib/crypto";
import { createCalendarEventWithMeet } from "@/lib/google/calendar";
import { sendEmailJS } from "@/lib/email/emailjs";

export type OpenSlot = {
  id: string;
  start_time: string;
  end_time: string;
  label: string | null;
};

export async function getOpenSlots(): Promise<{ slots: OpenSlot[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, start_time, end_time, label")
    .order("start_time", { ascending: true });

  if (error) return { slots: [], error: error.message };
  return { slots: (data ?? []) as OpenSlot[] };
}

const bookSlotSchema = z.object({
  slotId: z.string().uuid(),
  appointmentType: z.string().min(1),
  telehealth: z.boolean(),
});

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
    .select("id, start_time, end_time")
    .eq("id", parsed.data.slotId)
    .maybeSingle();

  if (slotErr || !slot) return { error: "This time slot is no longer available." };

  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);
  if (end <= start) return { error: "Invalid slot times." };

  const { data: overlap } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", user.id)
    .neq("status", "cancelled")
    .lt("start_time", end.toISOString())
    .gt("end_time", start.toISOString())
    .limit(1)
    .maybeSingle();

  if (overlap) return { error: "You already have an appointment overlapping this time." };

  const admin = createServiceClient();
  const { data: tok } = await admin
    .from("user_google_tokens")
    .select("encrypted_refresh_token, token_iv, auth_tag")
    .eq("user_id", user.id)
    .maybeSingle();

  let googleEventId: string | null = null;

  if (tok) {
    try {
      const refresh = decryptRefreshToken(
        tok.encrypted_refresh_token,
        tok.token_iv,
        tok.auth_tag
      );
      const clinic = process.env.CLINIC_CALENDAR_EMAIL?.trim() || null;
      const cal = await createCalendarEventWithMeet({
        refreshToken: refresh,
        summary: `MaternalCare Sync — ${parsed.data.appointmentType}`,
        description:
          "Prenatal visit via MaternalCare Sync. Calendar will email you 24 hours before this visit.",
        startIso: start.toISOString(),
        endIso: end.toISOString(),
        patientEmail: user.email,
        clinicEmail: clinic,
        telehealth: parsed.data.telehealth,
      });
      googleEventId = cal.eventId || null;
    } catch (e) {
      console.error("Calendar sync failed:", e);
    }
  }

  const { error: insertErr } = await supabase.from("appointments").insert({
    patient_id: user.id,
    slot_id: parsed.data.slotId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    status: "scheduled",
    appointment_type: parsed.data.appointmentType,
    is_telehealth: parsed.data.telehealth,
    google_event_id: googleEventId,
  });

  if (insertErr) {
    const code = "code" in insertErr ? String((insertErr as { code?: string }).code) : "";
    if (code === "23505" || insertErr.message?.includes("duplicate")) {
      return { error: "Someone just booked this slot. Please pick another time." };
    }
    return { error: insertErr.message };
  }

  // Inform the patient immediately via EmailJS (in addition to Google Calendar emails).
  try {
    if (process.env.EMAILJS_TEMPLATE_BOOKING_CONFIRMED) {
      const when = start.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      await sendEmailJS({
        toEmail: user.email,
        templateId: process.env.EMAILJS_TEMPLATE_BOOKING_CONFIRMED,
        templateParams: {
          patient_name: profile?.full_name ?? "there",
          appointment_type: parsed.data.appointmentType,
          appointment_time: when,
          telehealth: parsed.data.telehealth ? "Yes" : "No",
        },
      });
    }
  } catch (e) {
    // Booking should succeed even if email delivery fails.
    console.error("EmailJS booking email failed:", e);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
