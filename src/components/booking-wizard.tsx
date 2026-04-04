"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestAppointmentBooking } from "@/app/actions/slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  primarySuggestionBubble,
  SUGGESTION_LABELS,
  suggestedAppointmentTypes,
  type SuggestionKey,
} from "@/lib/maternal";

const schema = z.object({
  appointmentType: z.string().min(1, "Enter a visit type"),
  telehealth: z.boolean(),
  preferredStart: z.string().min(1, "Choose a date and time"),
  durationMinutes: z.coerce.number().int().min(15).max(240),
});

type Form = z.infer<typeof schema>;

type Props = {
  currentWeek: number | null;
};

function datetimeLocalMinNow() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingWizard({ currentWeek }: Props) {
  const suggestions = useMemo(
    () => suggestedAppointmentTypes(currentWeek),
    [currentWeek]
  );
  const contextBubble = primarySuggestionBubble(currentWeek);
  const minPreferred = useMemo(() => datetimeLocalMinNow(), []);

  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      appointmentType: "",
      telehealth: false,
      preferredStart: "",
      durationMinutes: 30,
    },
  });

  const appointmentType = form.watch("appointmentType");

  async function onSubmit(data: Form) {
    setMsg(null);
    const start = new Date(data.preferredStart);
    if (Number.isNaN(start.getTime())) {
      setMsg("That date and time is not valid.");
      return;
    }
    const res = await requestAppointmentBooking({
      appointmentType: data.appointmentType.trim(),
      telehealth: data.telehealth,
      startIso: start.toISOString(),
      durationMinutes: data.durationMinutes,
    });
    if ("error" in res && res.error) {
      setMsg(typeof res.error === "string" ? res.error : "Could not submit your request");
      return;
    }
    if ("emailSent" in res && res.emailSent) {
      setMsg(
        "Request received! Check your inbox for a confirmation email (and spam). The clinic will review your preferred time and email you again after approval."
      );
    } else if ("emailIssue" in res && res.emailIssue === "missing_env") {
      setMsg(
        "Your request was saved in the system. No email was sent because this server is missing GMAIL_USER or GMAIL_APP_PASSWORD. Add both to .env.local in the project root, then stop and restart npm run dev."
      );
    } else {
      setMsg(
        "Your request was saved. Gmail SMTP failed. If the terminal shows \"self-signed certificate in certificate chain\", antivirus or a proxy is intercepting TLS — try GMAIL_TLS_REJECT_UNAUTHORIZED=0 in .env.local (dev only), or disable email SSL scanning. Otherwise try GMAIL_SMTP_PORT=587 and verify your app password."
      );
    }
    form.reset({
      appointmentType: "",
      telehealth: false,
      preferredStart: "",
      durationMinutes: 30,
    });
    setStep(0);
  }

  function applySuggestion(key: SuggestionKey) {
    form.setValue("appointmentType", SUGGESTION_LABELS[key]);
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="text-primary">Book a visit</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Choose your visit type, then pick when you&apos;d like to come in. Your request stays{" "}
          <span className="font-medium text-foreground">pending</span> until the clinic approves it.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full border border-primary/25 bg-rose-soft/80 px-3 py-1.5 text-xs font-medium text-rose-foreground transition hover:bg-rose-soft"
              onClick={() => applySuggestion(s)}
            >
              {SUGGESTION_LABELS[s]}
            </button>
          ))}
          {suggestions.length === 0 && (
            <span className="text-sm text-muted-foreground">
              Add your due date for tailored visit suggestions.
            </span>
          )}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Visit type</Label>
                <Input
                  id="type"
                  className="rounded-xl"
                  {...form.register("appointmentType")}
                  placeholder="e.g. Weekly checkup, ultrasound"
                />
                {form.formState.errors.appointmentType && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.appointmentType.message}
                  </p>
                )}
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  {...form.register("telehealth")}
                />
                <span>Telehealth visit (adds Google Meet after approval)</span>
              </label>
              <Button
                type="button"
                className="rounded-full"
                disabled={!appointmentType?.trim()}
                onClick={async () => {
                  const ok = await form.trigger("appointmentType");
                  if (!ok) return;
                  setStep(1);
                }}
              >
                Next — date &amp; time
              </Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label htmlFor="preferred-start" className="text-base">
                    Preferred date &amp; time
                  </Label>
                  {contextBubble && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Suggested now: {contextBubble}
                    </span>
                  )}
                </div>
                <Input
                  id="preferred-start"
                  type="datetime-local"
                  min={minPreferred}
                  className="rounded-xl"
                  {...form.register("preferredStart")}
                />
                {form.formState.errors.preferredStart && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.preferredStart.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  The clinic may confirm this time or suggest an alternative after approval.
                </p>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="duration">Visit length</Label>
                  <select
                    id="duration"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 focus-visible:ring-offset-2"
                    {...form.register("durationMinutes", { valueAsNumber: true })}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setStep(0)}
                >
                  Back
                </Button>
                <Button type="submit" className="rounded-full">
                  Submit request
                </Button>
              </div>
            </div>
          )}
        </form>
        {msg && (
          <p className="mt-4 rounded-xl bg-eucalyptus-muted/50 px-4 py-3 text-sm text-foreground">
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
