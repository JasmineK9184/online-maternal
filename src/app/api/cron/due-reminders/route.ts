import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmailJS } from "@/lib/email/emailjs";
import { pregnancyWeekFromProfile } from "@/lib/maternal";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateOnlyISO(d: Date) {
  // Convert to YYYY-MM-DD (UTC). Since we store DATE columns, this is stable enough.
  return d.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If EmailJS env isn't configured, skip silently so the cron won't break.
  const emailTemplateId = process.env.EMAILJS_TEMPLATE_DUE_REMINDER;
  if (!emailTemplateId || !process.env.EMAILJS_SERVICE_ID || !process.env.EMAILJS_PUBLIC_KEY) {
    return NextResponse.json({ ok: true, skipped: true, reason: "EmailJS not configured" });
  }

  const admin = createServiceClient();
  const today = startOfDay(new Date());
  const daysForward = 7;
  const windowEnd = startOfDay(new Date(today.getTime() + daysForward * 24 * 60 * 60 * 1000));
  const dueStartStr = dateOnlyISO(today);
  const dueEndStr = dateOnlyISO(windowEnd);

  // If we don't have due_date, derive from LMP (+280 days).
  const lmpStart = new Date(today);
  lmpStart.setDate(lmpStart.getDate() - 280);
  const lmpEnd = new Date(windowEnd);
  lmpEnd.setDate(lmpEnd.getDate() - 280);
  const lmpStartStr = dateOnlyISO(lmpStart);
  const lmpEndStr = dateOnlyISO(lmpEnd);

  const [dueRows, lmpRows] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, due_date, lmp_date")
      .eq("role", "patient")
      .not("due_date", "is", null)
      .gte("due_date", dueStartStr)
      .lte("due_date", dueEndStr),
    admin
      .from("profiles")
      .select("id, full_name, due_date, lmp_date")
      .eq("role", "patient")
      .is("due_date", null)
      .not("lmp_date", "is", null)
      .gte("lmp_date", lmpStartStr)
      .lte("lmp_date", lmpEndStr),
  ]);

  const profileRows = [
    ...(dueRows.data ?? []),
    ...(lmpRows.data ?? []),
  ];
  const uniq = new Map<string, (typeof profileRows)[number]>();
  for (const p of profileRows) uniq.set(p.id, p);

  const reminderItems: Array<{
    userId: string;
    name: string;
    dueDate: Date;
    dueDateStr: string;
    week: number | null;
  }> = [];

  for (const p of uniq.values()) {
    let dueDate: Date | null = null;
    if (p.due_date) {
      dueDate = new Date(p.due_date);
    } else if (p.lmp_date) {
      const lmp = new Date(p.lmp_date);
      lmp.setDate(lmp.getDate() + 280);
      dueDate = lmp;
    }
    if (!dueDate) continue;

    const dueDateStr = dateOnlyISO(dueDate);
    if (dueDateStr < dueStartStr || dueDateStr > dueEndStr) continue;

    reminderItems.push({
      userId: p.id,
      name: p.full_name ?? "there",
      dueDate,
      dueDateStr,
      week: pregnancyWeekFromProfile(p.due_date ?? null, p.lmp_date ?? null),
    });
  }

  const candidateUserIds = Array.from(
    new Set(reminderItems.map((i) => i.userId))
  );
  const candidateDates = Array.from(
    new Set(reminderItems.map((i) => i.dueDateStr))
  );

  const { data: existing } = await admin
    .from("due_reminders")
    .select("user_id, reminder_date")
    .in("user_id", candidateUserIds)
    .in("reminder_date", candidateDates);

  const existingSet = new Set(
    (existing ?? []).map((r) => `${r.user_id}:${r.reminder_date}`)
  );

  const toSend = reminderItems.filter(
    (i) => !existingSet.has(`${i.userId}:${i.dueDateStr}`)
  );

  let sent = 0;
  const toInsert: Array<{ user_id: string; reminder_date: string }> = [];

  for (const item of toSend) {
    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(item.userId);
    const email = userData?.user?.email;
    if (userErr || !email) continue;

    try {
      await sendEmailJS({
        toEmail: email,
        templateId: emailTemplateId,
        templateParams: {
          patient_name: item.name,
          due_date: item.dueDateStr,
          pregnancy_week: item.week === null ? "" : String(item.week),
        },
      });

      toInsert.push({ user_id: item.userId, reminder_date: item.dueDateStr });
      sent += 1;
    } catch (e) {
      console.error("Due reminder send failed:", item.userId, item.dueDateStr, e);
    }
  }

  if (toInsert.length) {
    await admin.from("due_reminders").insert(toInsert);
  }

  return NextResponse.json({
    ok: true,
    candidates: reminderItems.length,
    checked: existing?.length ?? 0,
    sent,
  });
}

