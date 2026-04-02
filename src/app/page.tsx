import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let user = null;
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 bg-gradient-to-b from-cream via-background to-eucalyptus-muted/20 px-4 py-16">
      {!hasSupabaseEnv() && (
        <div className="w-full max-w-lg">
          <SupabaseSetupNotice />
        </div>
      )}
      <div className="text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
          MaternalCare Sync
        </h1>
        <p className="mt-3 text-muted-foreground">
          Automated prenatal scheduling with your Gmail and Google Calendar.
        </p>
      </div>
      <div className="flex gap-4">
        {hasSupabaseEnv() && user ? (
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        ) : hasSupabaseEnv() ? (
          <Button asChild>
            <Link href="/login">Sign in or create account</Link>
          </Button>
        ) : null}
      </div>
    </main>
  );
}
