import Link from "next/link";
import { JourneyProgress } from "@/components/journey-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Sparkles } from "lucide-react";

type NextAppt = {
  id: string;
  start_time: string;
  appointment_type: string;
  status: string;
} | null;

type MilestoneTip = {
  week_number: number;
  title: string;
  description: string | null;
};

type Props = {
  fullName: string | null;
  week: number | null;
  dueDateMissing: boolean;
  nextAppt: NextAppt;
  dailyTip: MilestoneTip | null;
  /** When true (e.g. admin role), hide the pregnancy timeline / personalize card to reduce clutter. */
  hidePatientJourneyChrome?: boolean;
};

const CHECKLIST = [
  "Take your prenatal vitamin if prescribed",
  "Drink water regularly through the day",
  "Note baby’s movements and questions for your OB",
  "Rest when you need to — fatigue is common",
];

export function PatientJourneyView({
  fullName,
  week,
  dueDateMissing,
  nextAppt,
  dailyTip,
  hidePatientJourneyChrome = false,
}: Props) {
  const name = (fullName ?? "").trim() || "there";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl md:leading-tight">
          Welcome back, {name}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Your journey — thoughtful care, one step at a time.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          {!hidePatientJourneyChrome ? (
            <Card className="overflow-hidden border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="font-serif text-2xl sm:text-3xl">Your Journey</CardTitle>
                <p className="text-sm font-medium text-muted-foreground">
                  Pregnancy progress and milestones
                </p>
              </CardHeader>
              <CardContent>
                <JourneyProgress week={week} dueDateMissing={dueDateMissing} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="font-serif text-2xl">Appointments</CardTitle>
                <p className="text-sm font-medium text-muted-foreground">What&apos;s next</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full border-gray-200">
                <Link href="/dashboard/appointments">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {!nextAppt ? (
                <p className="text-sm text-muted-foreground">
                  Nothing scheduled yet. Book a visit when you&apos;re ready.
                </p>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{nextAppt.appointment_type}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(nextAppt.start_time).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      Status: {nextAppt.status}
                    </p>
                  </div>
                  <Button asChild className="w-fit shrink-0 rounded-full">
                    <Link href="/dashboard/appointments">Book or manage</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 lg:hidden">
            <Button asChild className="rounded-full">
              <Link href="/dashboard/appointments">Book a visit</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-gray-200">
              <Link href="/dashboard/health-profile">Health profile</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#4B7B7F]" strokeWidth={1.5} aria-hidden />
                <CardTitle className="font-serif text-2xl">Daily tips</CardTitle>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Gentle guidance for this stage
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {dailyTip ? (
                <>
                  <p className="text-sm font-medium text-foreground">{dailyTip.title}</p>
                  {dailyTip.description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">{dailyTip.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Typical focus around week {dailyTip.week_number}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add your estimated due date in your health profile to see week-matched tips from our
                  care team.
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-2 rounded-full border-gray-200">
                <Link href="/dashboard/health-profile">Update health profile</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="font-serif text-2xl">Health checklist</CardTitle>
              <p className="text-sm font-medium text-muted-foreground">Small habits that add up</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#99B898]"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="hidden flex-wrap gap-3 lg:flex">
            <Button asChild className="rounded-full">
              <Link href="/dashboard/appointments">Book a visit</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-gray-200">
              <Link href="/dashboard/health-profile">Health profile</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
