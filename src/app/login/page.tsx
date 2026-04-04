"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

const labelCls = "text-sm font-medium text-[#4B7B7F]";
const fieldCls =
  "rounded-xl border-stone-300 bg-white text-sm text-[rgb(45,52,54)] focus-visible:ring-2 focus-visible:ring-[#4B7B7F]/25";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z
  .object({
    fullName: z.string().min(1, "How should we call you?"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const archivedNotice = searchParams.get("archived") === "1";
  const [oauthLoading, setOauthLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false);

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
      confirmPassword: "",
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
          ? "That email or password doesn't match. Try again or create an account."
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
    setShowSignUpPassword(false);
    setShowSignUpConfirm(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FBF9F6] px-4 py-12">
      <Card className="w-full max-w-md rounded-2xl border border-stone-200/90 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        <CardHeader className="space-y-2 p-10 pb-4 text-center sm:text-left">
          <CardTitle className="font-serif text-2xl text-[rgb(45,52,54)]">Welcome</CardTitle>
          <p className="text-sm leading-relaxed text-[rgb(45,52,54)]/70">
            New here? Create an account and go straight to your dashboard. Already registered?
            Switch to <span className="font-medium text-[rgb(45,52,54)]">Sign in</span>.
          </p>
        </CardHeader>
        <CardContent className="p-10 pt-4">
          {archivedNotice ? (
            <p
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              This account has been archived and can no longer access the app. If you think this is a mistake,
              contact your clinic.
            </p>
          ) : null}
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-stone-100/90 p-1">
              <TabsTrigger value="signup" className="rounded-full text-sm">
                Create account
              </TabsTrigger>
              <TabsTrigger value="signin" className="rounded-full text-sm">
                Sign in
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signup" className="space-y-4 pt-4">
              <p className="text-sm text-[rgb(45,52,54)]/70">
                Just your name, email, and a password — then you&apos;re in.
              </p>
              <form
                onSubmit={signUpForm.handleSubmit(onEmailSignUp)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="su-name" className={labelCls}>
                    Your name
                  </Label>
                  <Input
                    id="su-name"
                    autoComplete="name"
                    className={fieldCls}
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
                  <Label htmlFor="su-email" className={labelCls}>
                    Email
                  </Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    className={fieldCls}
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
                  <Label htmlFor="su-password" className={labelCls}>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="su-password"
                      type={showSignUpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${fieldCls} pr-11`}
                      placeholder="At least 8 characters"
                      {...signUpForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                      aria-label={showSignUpPassword ? "Hide password" : "Show password"}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-confirm" className={labelCls}>
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="su-confirm"
                      type={showSignUpConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className={`${fieldCls} pr-11`}
                      placeholder="Re-enter your password"
                      {...signUpForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpConfirm((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                      aria-label={showSignUpConfirm ? "Hide password" : "Show password"}
                    >
                      {showSignUpConfirm ? (
                        <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[#4B7B7F] text-sm font-semibold text-white hover:bg-[#4B7B7F]/90"
                  disabled={signingUp}
                >
                  {signingUp ? "Creating your account…" : "Create account & continue"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin" className="space-y-4 pt-4">
              <form
                onSubmit={signInForm.handleSubmit(onEmailSignIn)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="si-email" className={labelCls}>
                    Email
                  </Label>
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    className={fieldCls}
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-password" className={labelCls}>
                    Password
                  </Label>
                  <Input
                    id="si-password"
                    type="password"
                    autoComplete="current-password"
                    className={fieldCls}
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full rounded-full bg-[#4B7B7F] text-sm font-semibold text-white hover:bg-[#4B7B7F]/90"
                  disabled={signingIn}
                >
                  {signingIn ? "Signing you in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs text-[rgb(45,52,54)]/55">
              <span className="bg-white px-3">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="h-11 w-full rounded-full border-stone-300 text-[rgb(45,52,54)] hover:bg-stone-50"
            onClick={signInWithGoogle}
            disabled={oauthLoading}
          >
            {oauthLoading ? "Opening Google…" : "Continue with Google"}
          </Button>

          {formMsg && (
            <p
              className={`mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm ${
                formMsg.includes("sent a link") ? "text-[rgb(45,52,54)]" : "text-destructive"
              }`}
            >
              {formMsg}
            </p>
          )}

          <Button variant="ghost" className="mt-6 w-full text-[rgb(45,52,54)]/70" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
