"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { selectAppointmentRowWithArchiveFallback } from "@/lib/active-patients-query";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { decryptRefreshToken } from "@/lib/crypto";
import { createCalendarEventWithMeet } from "@/lib/google/calendar";
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

function safeReturnTo(raw: string) {
  const t = raw.trim();
  if (
    t === "/dashboard" ||
    t === "/dashboard/availability" ||
    t === "/dashboard/appointments"
  ) {
    return t;
  }
  return "/dashboard/availability";
}

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

const approveSchema = z.object({
  appointmentId: z.string().uuid(),
});

export async function approveAppointment(formData: FormData) {
  const returnBase = safeReturnTo(String(formData.get("returnTo") ?? ""));

  const parsed = approveSchema.safeParse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
  });

  if (!parsed.success) {
    redirect(`${returnBase}?error=${encodeURIComponent("Invalid appointmentId")}`);
  }

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) {
    redirect(`${returnBase}?error=${encodeURIComponent(gate.error ?? "Forbidden")}`);
  }

  const appt = await selectAppointmentRowWithArchiveFallback(
    gate.supabase,
    parsed.data.appointmentId,
    "id, patient_id, patient_email, start_time, end_time, appointment_type, is_telehealth, google_event_id, status, booking_approved_sent_at, archived_at",
    "id, patient_id, patient_email, start_time, end_time, appointment_type, is_telehealth, google_event_id, status, booking_approved_sent_at"
  );

  if (appt.error || !appt.data) {
    redirect(
      `${returnBase}?error=${encodeURIComponent(appt.error?.message ?? "Appointment not found")}`
    );
  }

  if (appt.data.archived_at) {
    redirect(`${returnBase}?error=${encodeURIComponent("This appointment is archived.")}`);
  }

  if (appt.data.status !== "pending") {
    redirect(`${returnBase}?error=${encodeURIComponent("This appointment is not pending")}`);
  }

  const apptRow = appt.data;

  // Approve: create Google Calendar event (if possible), set status to scheduled,
  // and send “approved” email once.
  let googleEventId = apptRow.google_event_id ?? null;
  if (!googleEventId) {
    try {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
        // Without a service-role key we can't read user tokens to create a calendar event.
        // Approval still succeeds; reminder sending will happen once event exists.
        googleEventId = null;
      } else {
        const service = createServiceClient();
        const { data: tok } = await service
          .from("user_google_tokens")
          .select("encrypted_refresh_token, token_iv, auth_tag")
          .eq("user_id", apptRow.patient_id)
          .maybeSingle();

        if (tok) {
          const refresh = decryptRefreshToken(
            tok.encrypted_refresh_token,
            tok.token_iv,
            tok.auth_tag
          );

          if (apptRow.patient_email) {
            const clinic = process.env.CLINIC_CALENDAR_EMAIL?.trim() || null;
            const cal = await createCalendarEventWithMeet({
              refreshToken: refresh,
              summary: `MaternalCare Sync — ${apptRow.appointment_type}`,
              description:
                "Prenatal visit via MaternalCare Sync. Calendar will email you 24 hours before this visit.",
              startIso: new Date(apptRow.start_time).toISOString(),
              endIso: new Date(apptRow.end_time).toISOString(),
              patientEmail: apptRow.patient_email,
              clinicEmail: clinic,
              telehealth: apptRow.is_telehealth,
            });
            googleEventId = cal.eventId || null;
          }
        }
      }
    } catch (e) {
      console.error("Calendar event creation during approval failed:", e);
    }
  }

  await gate.supabase.from("appointments").update({
    status: "scheduled",
    google_event_id: googleEventId,
  }).eq("id", apptRow.id);

  const patientEmail = (apptRow.patient_email ?? "").trim();
  const gmailReady =
    Boolean(process.env.GMAIL_USER?.trim()) && Boolean(process.env.GMAIL_APP_PASSWORD?.trim());

  if (
    !apptRow.booking_approved_sent_at &&
    patientEmail &&
    gmailReady
  ) {
    try {
      const { data: prof } = await gate.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", apptRow.patient_id)
        .maybeSingle();
      const displayName = (prof?.full_name ?? "").trim() || "there";
      const start = new Date(apptRow.start_time);
      const end = new Date(apptRow.end_time);
      const teleNote = apptRow.is_telehealth
        ? "\n\nThis visit is scheduled as telehealth. Check your Google Calendar event for a Meet link when your clinic has connected calendar."
        : "";
      await sendMail({
        to: patientEmail,
        subject: "MaternalCare — your appointment is approved",
        text: [
          `Hello ${displayName},`,
          "",
          "Great news — your appointment request has been approved by the clinic.",
          "",
          `Visit type: ${apptRow.appointment_type}`,
          `Date: ${formatLongDate(start)}`,
          `Time: ${formatTime(start)} – ${formatTime(end)}`,
          teleNote,
          "",
          "Thank you,",
          "MaternalCare",
        ].join("\n"),
      });
      await gate.supabase
        .from("appointments")
        .update({ booking_approved_sent_at: new Date().toISOString() })
        .eq("id", apptRow.id);
    } catch (e) {
      console.error("[mail] Approval notification failed:", e);
    }
  } else if (!apptRow.booking_approved_sent_at && patientEmail && !gmailReady) {
    console.warn("[mail] Approval saved but email skipped: GMAIL_USER / GMAIL_APP_PASSWORD not set.");
  }

  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");

  redirect(returnBase);
}

const rejectSchema = z.object({
  appointmentId: z.string().uuid(),
});

export async function rejectAppointment(formData: FormData) {
  const returnBase = safeReturnTo(String(formData.get("returnTo") ?? ""));

  const parsed = rejectSchema.safeParse({
    appointmentId: String(formData.get("appointmentId") ?? ""),
  });

  if (!parsed.success) {
    redirect(`${returnBase}?error=${encodeURIComponent("Invalid appointmentId")}`);
  }

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) {
    redirect(`${returnBase}?error=${encodeURIComponent(gate.error ?? "Forbidden")}`);
  }

  const appt = await selectAppointmentRowWithArchiveFallback(
    gate.supabase,
    parsed.data.appointmentId,
    "id, patient_id, patient_email, start_time, end_time, appointment_type, is_telehealth, status, archived_at",
    "id, patient_id, patient_email, start_time, end_time, appointment_type, is_telehealth, status"
  );

  if (appt.error || !appt.data) {
    redirect(
      `${returnBase}?error=${encodeURIComponent(appt.error?.message ?? "Appointment not found")}`
    );
  }

  if (appt.data.archived_at) {
    redirect(`${returnBase}?error=${encodeURIComponent("This appointment is archived.")}`);
  }

  if (appt.data.status !== "pending") {
    redirect(`${returnBase}?error=${encodeURIComponent("This appointment is not pending")}`);
  }

  const apptRow = appt.data;

  await gate.supabase.from("appointments").update({ status: "cancelled" }).eq("id", apptRow.id);

  const patientEmail = (apptRow.patient_email ?? "").trim();
  const gmailReady =
    Boolean(process.env.GMAIL_USER?.trim()) && Boolean(process.env.GMAIL_APP_PASSWORD?.trim());

  if (patientEmail && gmailReady) {
    try {
      const { data: prof } = await gate.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", apptRow.patient_id)
        .maybeSingle();
      const displayName = (prof?.full_name ?? "").trim() || "there";
      const start = new Date(apptRow.start_time);
      const end = new Date(apptRow.end_time);
      await sendMail({
        to: patientEmail,
        subject: "MaternalCare — appointment request update",
        text: [
          `Hello ${displayName},`,
          "",
          "Your appointment request could not be approved at this time and has been declined.",
          "",
          `Visit type: ${apptRow.appointment_type}`,
          `Requested date: ${formatLongDate(start)}`,
          `Requested time: ${formatTime(start)} – ${formatTime(end)}`,
          "",
          "If you still need care, please book another time from your dashboard or contact the clinic.",
          "",
          "Thank you,",
          "MaternalCare",
        ].join("\n"),
      });
    } catch (e) {
      console.error("[mail] Rejection notification failed:", e);
    }
  } else if (patientEmail && !gmailReady) {
    console.warn("[mail] Rejection saved but email skipped: GMAIL_USER / GMAIL_APP_PASSWORD not set.");
  }

  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard");

  redirect(returnBase);
}

export type AdminAppointmentArchiveResult = { ok: true } | { error: string };

export async function archiveAppointment(
  appointmentId: string
): Promise<AdminAppointmentArchiveResult> {
  const parsed = z.string().uuid().safeParse(appointmentId);
  if (!parsed.success) return { error: "Invalid appointment." };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { data: row, error } = await gate.supabase
    .from("appointments")
    .select("id, archived_at")
    .eq("id", parsed.data)
    .single();

  if (error || !row) return { error: error?.message ?? "Appointment not found." };
  if (row.archived_at) return { error: "This appointment is already archived." };

  const { error: upErr } = await gate.supabase
    .from("appointments")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .is("archived_at", null);

  if (upErr) return { error: upErr.message };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/profile-settings");
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard");
  return { ok: true };
}

export type AdminAppointmentRestoreResult = { ok: true } | { error: string };

export async function restoreAppointment(
  appointmentId: string
): Promise<AdminAppointmentRestoreResult> {
  const parsed = z.string().uuid().safeParse(appointmentId);
  if (!parsed.success) return { error: "Invalid appointment." };

  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error ?? "Forbidden" };

  const { data: row, error } = await gate.supabase
    .from("appointments")
    .select("id, archived_at")
    .eq("id", parsed.data)
    .single();

  if (error || !row) return { error: error?.message ?? "Appointment not found." };
  if (!row.archived_at) return { error: "This appointment is not archived." };

  const { error: upErr } = await gate.supabase
    .from("appointments")
    .update({ archived_at: null })
    .eq("id", parsed.data)
    .not("archived_at", "is", null);

  if (upErr) return { error: upErr.message };

  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/profile-settings");
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard");
  return { ok: true };
}

