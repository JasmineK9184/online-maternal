import { NextResponse } from "next/server";
import { decryptRefreshToken } from "@/lib/crypto";
import { sendEmailAsUser } from "@/lib/google/gmail";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Retention: optional Gmail reminder ~24h before visit (in addition to Google Calendar email reminders).
 * Schedule with Vercel Cron or similar: GET /api/cron/reminders with Authorization: Bearer CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: rows, error } = await admin
    .from("appointments")
    .select("id, patient_id, start_time, appointment_type, reminder_sent_at")
    .eq("status", "scheduled")
    .is("archived_at", null)
    .is("reminder_sent_at", null)
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const row of rows ?? []) {
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
      row.patient_id
    );
    if (userErr || !userData.user.email) continue;

    const { data: tok } = await admin
      .from("user_google_tokens")
      .select("encrypted_refresh_token, token_iv, auth_tag")
      .eq("user_id", row.patient_id)
      .maybeSingle();

    if (!tok) continue;

    try {
      const refresh = decryptRefreshToken(
        tok.encrypted_refresh_token,
        tok.token_iv,
        tok.auth_tag
      );
      const when = new Date(row.start_time).toLocaleString();
      await sendEmailAsUser({
        refreshToken: refresh,
        to: userData.user.email,
        subject: "MaternalCare Sync — appointment tomorrow",
        bodyText: `Reminder: your ${row.appointment_type} visit is scheduled for ${when}. See your Google Calendar for details.`,
      });

      await admin
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } catch (e) {
      console.error("Reminder send failed", row.id, e);
    }
  }

  return NextResponse.json({ ok: true, checked: rows?.length ?? 0, sent });
}
