import Link from "next/link";
import { redirect } from "next/navigation";
import { updateProfileSettings } from "@/app/actions/profile-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type Search = { saved?: string; error?: string };

export default async function ProfileSettingsPage({
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your email and password.
        </p>
      </div>

      {sp.saved === "1" && (
        <p
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          Settings updated.
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
          <CardTitle className="text-xl text-foreground">
            Account details
          </CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            For security, confirm your new details using your password.
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={updateProfileSettings}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                className="rounded-xl"
                defaultValue={user.email ?? ""}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                className="rounded-xl"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" className="rounded-full">
                Update settings
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

