import { Flower2 } from "lucide-react";

const MILESTONE_WEEKS = [8, 12, 20, 24, 28, 36, 40] as const;

type Props = {
  week: number | null;
};

export function JourneyProgress({ week }: Props) {
  const pct = week === null ? 0 : Math.min(100, Math.max(0, (week / 40) * 100));

  return (
    <div className="space-y-6">
      {week === null ? (
        <div className="flex gap-4 rounded-2xl border border-dashed border-eucalyptus-muted bg-eucalyptus-muted/40 px-4 py-5 sm:px-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-soft text-rose-foreground shadow-inner">
            <Flower2 className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-serif text-base font-semibold text-foreground">
              Personalize your care
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Add your estimated due date below so we can show your pregnancy week, a
              gentle timeline of milestones, and visit suggestions that match where you
              are in your journey.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-lg font-semibold text-foreground sm:text-xl">
              Week {week}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                of your 40-week journey
              </span>
            </p>
            <span className="text-sm text-muted-foreground">
              You&apos;re doing great — here&apos;s what&apos;s ahead.
            </span>
          </div>
        </div>
      )}

      <div className="relative pt-2">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Pregnancy timeline
        </p>
        <div className="relative h-3 w-full overflow-visible rounded-full bg-eucalyptus-muted/80">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={week ?? 0}
            aria-valuemin={0}
            aria-valuemax={40}
            aria-label={week === null ? "Timeline incomplete" : `Week ${week} of 40`}
          />
          {week !== null && (
            <div
              className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-md"
              style={{ left: `${pct}%` }}
            />
          )}
        </div>

        <div className="relative mt-1 h-8 w-full">
          {MILESTONE_WEEKS.map((mw) => {
            const pos = (mw / 40) * 100;
            const passed = week !== null && week >= mw;
            return (
              <div
                key={mw}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pos}%` }}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    passed
                      ? "bg-primary ring-2 ring-primary/25"
                      : "bg-eucalyptus/90 ring-1 ring-border"
                  }`}
                  title={`Week ${mw}`}
                />
                <span className="mt-1 hidden text-[10px] font-medium text-muted-foreground sm:block">
                  {mw}w
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
