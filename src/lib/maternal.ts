/** Prefer due date; otherwise derive EDD from LMP (+280 days) for week calc */
export function pregnancyWeekFromProfile(
  dueDate: Date | string | null,
  lmpDate: Date | string | null
): number | null {
  if (dueDate) return pregnancyWeek(dueDate);
  if (!lmpDate) return null;
  const lmp = typeof lmpDate === "string" ? new Date(lmpDate) : lmpDate;
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280);
  return pregnancyWeek(edd.toISOString().slice(0, 10));
}

/** 40-week model: weeks from LMP implied by due date */
export function pregnancyWeek(dueDate: Date | string | null): number | null {
  if (!dueDate) return null;
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  const w = Math.floor(40 - diffDays / 7);
  return Math.max(0, Math.min(42, w));
}

export type SuggestionKey =
  | "first_prenatal"
  | "anatomy"
  | "glucose"
  | "weekly";

export function suggestedAppointmentTypes(week: number | null): SuggestionKey[] {
  if (week === null) return [];
  const out: SuggestionKey[] = [];
  if (week >= 8 && week <= 12) out.push("first_prenatal");
  if (week >= 18 && week <= 22) out.push("anatomy");
  if (week >= 24 && week <= 28) out.push("glucose");
  if (week >= 36) out.push("weekly");
  return out;
}

export const SUGGESTION_LABELS: Record<SuggestionKey, string> = {
  first_prenatal: "First Prenatal / Ultrasound (weeks 8–12)",
  anatomy: "Anatomy Scan (weeks 18–22)",
  glucose: "Glucose Screening (weeks 24–28)",
  weekly: "Weekly Checkups (week 36+)",
};

/** Short label for contextual chips on booking slots */
export const SUGGESTION_SHORT: Record<SuggestionKey, string> = {
  first_prenatal: "12-week scan window",
  anatomy: "Anatomy scan",
  glucose: "Glucose screen",
  weekly: "Weekly check-in",
};

export function primarySuggestionBubble(week: number | null): string | null {
  const keys = suggestedAppointmentTypes(week);
  if (!keys.length) return null;
  return SUGGESTION_SHORT[keys[0]];
}
