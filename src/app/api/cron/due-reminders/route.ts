import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/mail";
import { isMissingArchivedAtSchemaError } from "@/lib/active-patients-query";
import { pregnancyWeekFromProfile } from "@/lib/maternal";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Calendar YYYY-MM-DD in the server's local timezone (matches how users pick dates in the UI). */
function dateOnlyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Postgres DATE / ISO date string → YYYY-MM-DD for comparisons. */
function ymdFromProfileDate(value: string | null): string | null {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return dateOnlyLocal(new Date(s));
}

function localNoonFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDaysToYmd(ymd: string, days: number): string {
  const d = localNoonFromYmd(ymd);
  d.setDate(d.getDate() + days);
  return dateOnlyLocal(d);
}

/** e.g. April 11, 2026 */
function formatMediumDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

function firstNameFromFullName(full: string | null | undefined): string {
  const t = (full ?? "").trim();
  if (!t) return "there";
  const first = t.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Stage copy for the one-week-before-due email; bands follow `pregnancyWeekFromProfile` (often 40+ when due is 7 days out). */
function dueReminderStageParagraph(week: number | null): string {
  if (week == null) {
    return (
      "At this stage, many people feel extra tired or notice practice contractions. " +
      "Please ensure your hospital bag is by the door and your birth plan is ready."
    );
  }
  const lead = `You are currently in Week ${week}. `;
  if (week >= 40) {
    return (
      lead +
      "At this stage, it is normal to feel extra tired or have mild Braxton Hicks contractions. " +
      "Please ensure your hospital bag is by the door and your birth plan is ready."
    );
  }
  if (week >= 37) {
    return (
      lead +
      "You are in the full-term window, and labor could begin anytime. " +
      "Watch for regular contractions, leaking fluid, or changes in your baby's movement. " +
      "Keep your hospital bag ready and your birth plan handy, and call your care team if anything feels off."
    );
  }
  if (week >= 34) {
    return (
      lead +
      "If you notice regular contractions, increasing pressure, bleeding, or your water breaking, contact your provider promptly—even before your due date. " +
      "Have your go-bag and important numbers within easy reach."
    );
  }
  return (
    lead +
    "If this does not match what your clinician told you, please update your due date in the app or confirm with your care team. " +
    "Keep your hospital plan and contacts ready for when labor begins."
  );
}

/** Shared by GET (Vercel Cron, manual curl) and POST (Supabase pg_net http_post). */
async function handleDueRemindersCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GMAIL_USER?.trim() || !process.env.GMAIL_APP_PASSWORD?.trim()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Gmail app password not configured" });
  }

  const admin = createServiceClient();
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
  const targetYmd = dateOnlyLocal(target);

  const lmpTarget = new Date(target);
  lmpTarget.setDate(lmpTarget.getDate() - 280);
  const lmpDateStr = dateOnlyLocal(lmpTarget);

  const dueWithArch = await admin
    .from("profiles")
    .select("id, full_name, due_date, lmp_date, archived_at")
    .eq("role", "patient")
    .not("due_date", "is", null)
    .eq("due_date", targetYmd);

  let dueData = dueWithArch.data ?? [];
  if (dueWithArch.error && isMissingArchivedAtSchemaError(dueWithArch.error)) {
    const fb = await admin
      .from("profiles")
      .select("id, full_name, due_date, lmp_date")
      .eq("role", "patient")
      .not("due_date", "is", null)
      .eq("due_date", targetYmd);
    dueData = fb.data ?? [];
  } else if (!dueWithArch.error) {
    dueData = dueData.filter((p) => !(p as { archived_at?: string | null }).archived_at);
  }

  const lmpWithArch = await admin
    .from("profiles")
    .select("id, full_name, due_date, lmp_date, archived_at")
    .eq("role", "patient")
    .is("due_date", null)
    .not("lmp_date", "is", null)
    .eq("lmp_date", lmpDateStr);

  let lmpData = lmpWithArch.data ?? [];
  if (lmpWithArch.error && isMissingArchivedAtSchemaError(lmpWithArch.error)) {
    const fb = await admin
      .from("profiles")
      .select("id, full_name, due_date, lmp_date")
      .eq("role", "patient")
      .is("due_date", null)
      .not("lmp_date", "is", null)
      .eq("lmp_date", lmpDateStr);
    lmpData = fb.data ?? [];
  } else if (!lmpWithArch.error) {
    lmpData = lmpData.filter((p) => !(p as { archived_at?: string | null }).archived_at);
  }

  const profileRows = [...dueData, ...lmpData];
  const uniq = new Map<string, (typeof profileRows)[number]>();
  for (const p of profileRows) uniq.set(p.id, p);

  const reminderItems: Array<{
    userId: string;
    fullName: string;
    dueDate: Date;
    dueDateStr: string;
    due_date: string | null;
    lmp_date: string | null;
  }> = [];

  for (const p of uniq.values()) {
    let dueYmd: string | null = null;
    if (p.due_date) {
      dueYmd = ymdFromProfileDate(p.due_date);
    } else if (p.lmp_date) {
      const lmpYmd = ymdFromProfileDate(p.lmp_date);
      if (!lmpYmd) continue;
      dueYmd = addDaysToYmd(lmpYmd, 280);
    }
    if (!dueYmd || dueYmd !== targetYmd) continue;

    reminderItems.push({
      userId: p.id,
      fullName: (p.full_name ?? "").trim(),
      dueDate: localNoonFromYmd(dueYmd),
      dueDateStr: dueYmd,
      due_date: p.due_date,
      lmp_date: p.lmp_date,
    });
  }

  const candidateUserIds = Array.from(new Set(reminderItems.map((i) => i.userId)));
  const candidateDates = Array.from(new Set(reminderItems.map((i) => i.dueDateStr)));

  const profileQueryErrors = [dueRows.error, lmpRows.error].filter(Boolean).map((e) => e.message);

  const { data: existing, error: existingErr } =
    candidateUserIds.length > 0 && candidateDates.length > 0
      ? await admin
          .from("due_reminders")
          .select("user_id, reminder_date")
          .in("user_id", candidateUserIds)
          .in("reminder_date", candidateDates)
      : { data: [] as { user_id: string; reminder_date: string }[], error: null };

  const existingSet = new Set((existing ?? []).map((r) => `${r.user_id}:${r.reminder_date}`));

  const toSend = reminderItems.filter((i) => !existingSet.has(`${i.userId}:${i.dueDateStr}`));

  let sent = 0;
  let skippedNoEmail = 0;
  let mailFailureCount = 0;
  const toInsert: Array<{ user_id: string; reminder_date: string }> = [];

  for (const item of toSend) {
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(item.userId);
    const email = userData?.user?.email?.trim();
    if (userErr || !email) {
      skippedNoEmail += 1;
      continue;
    }

    try {
      const duePhrase = formatMediumDate(item.dueDate);
      const firstName = firstNameFromFullName(item.fullName);
      const week = pregnancyWeekFromProfile(item.due_date, item.lmp_date);
      const stageParagraph = dueReminderStageParagraph(week);

      const body = [
        `Hello ${firstName},`,
        "",
        `We are thinking of you! Our records show your estimated due date is just one week away on ${duePhrase}.`,
        "",
        stageParagraph,
        "",
        "We are excited for you!",
        "— MaternalCare Sync Team",
      ].join("\n");

      await sendMail({
        to: email,
        subject: "Your big day is approaching! — MaternalCare",
        text: body,
      });

      toInsert.push({ user_id: item.userId, reminder_date: item.dueDateStr });
      sent += 1;
    } catch (e) {
      mailFailureCount += 1;
      console.error("Due reminder send failed:", item.userId, item.dueDateStr, e);
    }
  }

  let insertError: string | null = null;
  if (toInsert.length) {
    const { error: insErr } = await admin.from("due_reminders").insert(toInsert);
    if (insErr) insertError = insErr.message;
  }

  const todayYmd = dateOnlyLocal(today);

  return NextResponse.json({
    ok: true,
    /** Calendar "today" for this run (Node local TZ; set TZ=Asia/Manila on Vercel if dates should follow that zone). */
    serverTodayYmd: todayYmd,
    targetDueDate: targetYmd,
    /** Rows returned by profiles query (due_date = target). If 0, no patient matched — often TZ/calendar mismatch vs DB. */
    matchedByDueDateQuery: dueRows.data?.length ?? 0,
    matchedByLmpQuery: lmpRows.data?.length ?? 0,
    profileQueryErrors,
    dueRemindersLookupError: existingErr?.message ?? null,
    candidates: reminderItems.length,
    /** Already recorded in due_reminders (idempotent skip). */
    alreadyReminded: reminderItems.length - toSend.length,
    pendingAfterDedup: toSend.length,
    skippedNoAuthEmail: skippedNoEmail,
    mailFailureCount,
    checked: existing?.length ?? 0,
    sent,
    insertError,
  });
}

export async function GET(request: Request) {
  return handleDueRemindersCron(request);
}

export async function POST(request: Request) {
  return handleDueRemindersCron(request);
}
