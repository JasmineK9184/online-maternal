import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Decorative line-art backdrop (mother & child motif) — gold/cream strokes, subtle. */
function HeroLineIllustration() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-amber-800/25"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 560"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path
        d="M80 380 C200 320 260 180 420 160 C520 148 600 220 680 200 C780 176 840 80 940 100 C1040 120 1120 260 1140 360"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M420 420 C460 300 500 220 580 200 C640 186 700 220 740 280 C780 340 800 420 780 480"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.65"
      />
      <circle cx="540" cy="210" r="36" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <path
        d="M498 256 C520 296 556 318 596 314 C636 310 668 276 676 236"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M560 314 C544 360 532 408 528 452 C524 488 548 512 588 508"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.55"
      />
      <path
        d="M980 120 C900 200 820 280 760 360 C720 416 700 468 708 520"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

export default async function Home() {
  let user = null;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  }

  const authed = hasSupabaseEnv() && !!user;
  const mainCtaHref = authed ? "/dashboard" : "/login";
  const mainCtaLabel = authed ? "Go to your dashboard" : "Sign in or create account";

  return (
    <div className="min-h-screen bg-[#FBF9F6] text-[rgb(45,52,54)]">
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-gray-100 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-lg font-semibold tracking-tight text-[#4B7B7F] sm:text-xl"
          >
            MaternalCare Sync
          </Link>
          <nav className="flex max-w-[70%] flex-wrap items-center justify-end gap-3 sm:max-w-none sm:gap-8">
            <a
              href="#about"
              className="text-sm font-medium text-[rgb(45,52,54)]/85 transition-colors hover:text-[#4B7B7F]"
            >
              About Us
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-[rgb(45,52,54)]/85 transition-colors hover:text-[#4B7B7F]"
            >
              Contact
            </a>
            {authed ? (
              <Button
                asChild
                className="rounded-full bg-[#4B7B7F] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#4B7B7F]/90"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-full bg-[#4B7B7F] px-5 text-sm font-medium text-white shadow-sm hover:bg-[#4B7B7F]/90"
              >
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="pt-16">
        {!hasSupabaseEnv() && (
          <div className="mx-auto max-w-lg px-4 py-8">
            <SupabaseSetupNotice />
          </div>
        )}

        <section
          id="top"
          className="relative overflow-hidden border-b border-gray-100/80 bg-gradient-to-b from-white to-[#FBF9F6]"
        >
          <div className="absolute inset-0 text-amber-700/20">
            <HeroLineIllustration />
          </div>
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[rgb(45,52,54)] sm:text-5xl sm:leading-[1.1]">
              MaternalCare Sync
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[rgb(45,52,54)]/75 sm:text-lg">
              Automated prenatal scheduling with your Gmail and Google Calendar.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-10 h-12 rounded-full border-0 bg-[#99B898] px-10 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#8aab89]"
            >
              <Link href={mainCtaHref}>{mainCtaLabel}</Link>
            </Button>
          </div>
        </section>

        <section id="about" className="border-b border-gray-100/80 bg-[#FBF9F6] py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:gap-12 sm:px-6 lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <Image
                src="https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=1200&auto=format&fit=crop"
                alt="Mother gently holding her infant — warm, welcoming care"
                width={800}
                height={600}
                className="aspect-[4/3] h-auto w-full object-cover"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4B7B7F]">
                About Us
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[rgb(45,52,54)] sm:text-4xl">
                Your Journey, Simplified
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[rgb(45,52,54)]/78">
                MaternalCare Sync helps your clinic stay coordinated while families feel supported —
                fewer missed steps, clearer expectations, and scheduling that fits real life.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  {
                    title: "Personalized Timeline",
                    body: "Track milestones and visit timing that align with where you are in pregnancy.",
                  },
                  {
                    title: "Automated Reminders",
                    body: "Thoughtful nudges so important dates do not slip through the cracks.",
                  },
                  {
                    title: "Direct Gmail Integration",
                    body: "Connect scheduling and communication through tools your team already trusts.",
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  >
                    <p className="font-semibold text-[rgb(45,52,54)]">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[rgb(45,52,54)]/72">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="contact" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-[#FBF9F6] p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:p-10">
              <h2 className="font-serif text-2xl font-semibold text-[rgb(45,52,54)] sm:text-3xl">
                Contact
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(45,52,54)]/75">
                Questions about onboarding your clinic or using MaternalCare Sync? Reach out — we read
                every message.
              </p>
              <p className="mt-6 text-sm font-medium text-[#4B7B7F]">
                <a href="mailto:hello@maternalcaresync.com" className="underline-offset-4 hover:underline">
                  hello@maternalcaresync.com
                </a>
              </p>
              <p className="mt-4 text-xs text-[rgb(45,52,54)]/55">
                Replace this placeholder email with your clinic&apos;s real contact address.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
