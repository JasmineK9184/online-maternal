"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/client";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z.object({
  fullName: z.string().min(1, "How should we call you?"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  const signingIn = signInForm.formState.isSubmitting;
  const signingUp = signUpForm.formState.isSubmitting;

  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-10">
        <SupabaseSetupNotice />
      </main>
    );
  }

  async function signInWithGoogle() {
    setOauthLoading(true);
    setFormMsg(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/dashboard`,
        scopes:
          "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.send",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    setOauthLoading(false);
  }

  async function onEmailSignIn(data: SignInValues) {
    setFormMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password,
    });
    if (error) {
      const m = error.message.toLowerCase();
      setFormMsg(
        m.includes("invalid") || m.includes("wrong")
          ? "That email or password doesn’t match. Try again or create an account."
          : error.message
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onEmailSignUp(data: SignUpValues) {
    setFormMsg(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { data: res, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: { full_name: data.fullName.trim(), name: data.fullName.trim() },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setFormMsg(error.message);
      return;
    }
    if (res.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setFormMsg(
      "We sent a link to your email. Open it once to finish signing up — then you can sign in here."
    );
    signUpForm.reset();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cream via-background to-rose-soft/35 px-4 py-12">
      <Card className="w-full max-w-md border-border/50 shadow-card">
        <CardHeader className="space-y-2 text-center sm:text-left">
          <CardTitle className="text-2xl text-foreground">Welcome</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">
            New here? Create an account and go straight to your dashboard. Already registered?
            Switch to <span className="font-medium text-foreground">Sign in</span>.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/80 p-1">
              <TabsTrigger value="signup" className="rounded-full">
                Create account
              </TabsTrigger>
              <TabsTrigger value="signin" className="rounded-full">
                Sign in
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Just your name, email, and a password — then you&apos;re in.
              </p>
              <form
                onSubmit={signUpForm.handleSubmit(onEmailSignUp)}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="su-name">Your name</Label>
                  <Input
                    id="su-name"
                    autoComplete="name"
                    className="rounded-xl"
                    placeholder="e.g. Maria Santos"
                    {...signUpForm.register("fullName")}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    className="rounded-xl"
                    placeholder="you@example.com"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    type="password"
                    autoComplete="new-password"
                    className="rounded-xl"
                    placeholder="At least 8 characters"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={signingUp}>
                  {signingUp ? "Creating your account…" : "Create account & continue"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin" className="space-y-4 pt-1">
              <form
                onSubmit={signInForm.handleSubmit(onEmailSignIn)}
                className="space-y-3"
              >
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    className="rounded-xl"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password">Password</Label>
                  <Input
                    id="si-password"
                    type="password"
                    autoComplete="current-password"
                    className="rounded-xl"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={signingIn}>
                  {signingIn ? "Signing you in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-3">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-full border-border/80"
            onClick={signInWithGoogle}
            disabled={oauthLoading}
          >
            {oauthLoading ? "Opening Google…" : "Continue with Google"}
          </Button>

          {formMsg && (
            <p
              className={`mt-4 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm ${
                formMsg.includes("sent a link") ? "text-foreground" : "text-destructive"
              }`}
            >
              {formMsg}
            </p>
          )}

          <Button variant="ghost" className="mt-4 w-full" asChild>
            <Link href="/">← Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
