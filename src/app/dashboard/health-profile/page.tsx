import Link from "next/link";
import { redirect } from "next/navigation";
import { saveProfileForm } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Search = { saved?: string; error?: string };

export default async function HealthProfilePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!hasSupabaseEnv()) {
    redirect("/dashboard");
  }

  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, due_date, lmp_date, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Health profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details help us personalize your journey and visit suggestions.
        </p>
      </div>

      {sp.saved === "1" && (
        <p
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          Profile saved.
        </p>
      )}
      {sp.error && (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {decodeURIComponent(sp.error)}
        </p>
      )}

      <Card className="border-border/40 shadow-card">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Contact & pregnancy dates</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Due date takes priority for week-by-week guidance; if empty, we use LMP (+280 days).
          </p>
        </CardHeader>
        <CardContent>
          <form action={saveProfileForm} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                className="rounded-xl"
                defaultValue={profile?.full_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                className="rounded-xl"
                defaultValue={profile?.phone ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Estimated due date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                className="rounded-xl"
                defaultValue={profile?.due_date ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lmp_date">Last menstrual period (LMP)</Label>
              <Input
                id="lmp_date"
                name="lmp_date"
                type="date"
                className="rounded-xl"
                defaultValue={profile?.lmp_date ?? ""}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="rounded-full">
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="underline decoration-primary/40 underline-offset-2"
        >
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
