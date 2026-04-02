"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookSlotAppointment, getOpenSlots } from "@/app/actions/slots";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  primarySuggestionBubble,
  SUGGESTION_LABELS,
  suggestedAppointmentTypes,
  type SuggestionKey,
} from "@/lib/maternal";

const schema = z.object({
  appointmentType: z.string().min(1),
  telehealth: z.boolean(),
  slotId: z.string().uuid().optional(),
});

type Form = z.infer<typeof schema>;

type Props = {
  currentWeek: number | null;
};

function formatSlotDate(iso: string) {
  const d = new Date(iso);
  return {
    line1: d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    }),
    line2: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function BookingWizard({ currentWeek }: Props) {
  const queryClient = useQueryClient();
  const suggestions = useMemo(
    () => suggestedAppointmentTypes(currentWeek),
    [currentWeek]
  );
  const contextBubble = primarySuggestionBubble(currentWeek);

  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  const { data: slots = [], isLoading, error: slotsError } = useQuery({
    queryKey: ["open-slots"],
    queryFn: async () => {
      const r = await getOpenSlots();
      if (r.error) throw new Error(r.error);
      return r.slots;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      appointmentType: "",
      telehealth: false,
      slotId: undefined,
    },
  });

  const appointmentType = form.watch("appointmentType");
  const selectedSlotId = form.watch("slotId");

  async function onSubmit(data: Form) {
    setMsg(null);
    if (!data.appointmentType?.trim()) {
      setMsg("Choose a visit type first.");
      return;
    }
    if (!data.slotId) {
      setMsg("Choose an available time slot.");
      return;
    }
    const res = await bookSlotAppointment({
      slotId: data.slotId,
      appointmentType: data.appointmentType,
      telehealth: data.telehealth,
    });
    if ("error" in res && res.error) {
      setMsg(typeof res.error === "string" ? res.error : "Could not book");
      return;
    }
    setMsg("Booked! Check Gmail and Google Calendar for your invite and reminders.");
    form.reset({ appointmentType: "", telehealth: false, slotId: undefined });
    setStep(0);
    await queryClient.invalidateQueries({ queryKey: ["open-slots"] });
  }

  function applySuggestion(key: SuggestionKey) {
    form.setValue("appointmentType", SUGGESTION_LABELS[key]);
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader>
        <CardTitle className="text-primary">Book a visit</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Choose how you&apos;d like to be seen, then pick a time. Slots update in real
          time.
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
                  placeholder="e.g. Anatomy scan"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  {...form.register("telehealth")}
                />
                <span>Telehealth visit (adds Google Meet)</span>
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
                Next — choose a time
              </Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label className="text-base">Available times</Label>
                  {contextBubble && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Suggested now: {contextBubble}
                    </span>
                  )}
                </div>
                {slotsError && (
                  <p className="text-sm text-destructive">Could not load slots.</p>
                )}
                {isLoading && (
                  <p className="text-sm text-muted-foreground">Loading times…</p>
                )}
                {!isLoading && slots.length === 0 && (
                  <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    No open times right now. Your clinic can add slots in the admin
                    panel.
                  </p>
                )}
                <div className="grid max-h-[min(420px,55vh)] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {slots.map((s) => {
                    const selected = selectedSlotId === s.id;
                    const { line1, line2 } = formatSlotDate(s.start_time);
                    const endT = new Date(s.end_time).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          "relative cursor-pointer rounded-2xl border-2 bg-card p-4 shadow-card transition-all hover:shadow-card-hover",
                          selected
                            ? "border-primary bg-primary/[0.06] ring-2 ring-primary/20"
                            : "border-transparent ring-1 ring-border/40"
                        )}
                      >
                        <input
                          type="radio"
                          value={s.id}
                          className="sr-only"
                          {...form.register("slotId")}
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-serif text-lg font-semibold leading-tight text-foreground sm:text-xl">
                              {line1}
                            </p>
                            <p className="mt-1 text-sm font-medium text-primary">
                              {line2} – {endT}
                            </p>
                            {s.label && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {s.label}
                              </p>
                            )}
                          </div>
                          {contextBubble && (
                            <span className="shrink-0 self-start rounded-full bg-rose-soft px-2.5 py-1 text-[11px] font-medium leading-tight text-rose-foreground">
                              {contextBubble}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
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
                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={
                      !slots.length ||
                      isLoading ||
                      !selectedSlotId ||
                      !appointmentType?.trim()
                    }
                  >
                  Confirm booking
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
