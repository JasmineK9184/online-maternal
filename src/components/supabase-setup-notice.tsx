import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SupabaseSetupNotice() {
  return (
    <Card className="border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <CardHeader>
        <CardTitle className="text-lg">Connect Supabase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Add your project URL and anon key to{" "}
          <code className="rounded bg-muted px-1 py-0.5">.env.local</code>{" "}
          (see <code className="rounded bg-muted px-1 py-0.5">.env.example</code>
          ).
        </p>
        <p>
          Open{" "}
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            className="font-medium underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Supabase → Project Settings → API
          </a>{" "}
          and copy <strong>Project URL</strong> and the <strong>anon public</strong>{" "}
          key into:
        </p>
        <ul className="list-inside list-disc text-muted-foreground">
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        <p className="text-muted-foreground">
          Restart <code className="rounded bg-muted px-1">npm run dev</code> after
          saving.
        </p>
        <p>
          <Link href="/" className="font-medium underline underline-offset-2">
            ← Back home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
