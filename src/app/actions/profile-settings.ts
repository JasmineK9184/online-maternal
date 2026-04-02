"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  // Password is optional so users can update email without changing password.
  password: z
    .string()
    .optional()
    .transform((v) => (v && String(v).trim().length > 0 ? String(v).trim() : undefined))
    .refine((v) => v === undefined || v.length >= 8, "Password must be at least 8 characters"),
});

export async function updateProfileSettings(formData: FormData) {
  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: formData.get("password") ? String(formData.get("password")) : undefined,
  });

  if (!parsed.success) {
    const msg =
      Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .filter(Boolean)[0] ?? "Please check your details.";
    redirect(`/dashboard/profile-settings?error=${encodeURIComponent(String(msg))}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email.trim(),
    ...(parsed.data.password ? { password: parsed.data.password } : {}),
  });

  if (error) {
    redirect(`/dashboard/profile-settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard/profile-settings?saved=1");
}

