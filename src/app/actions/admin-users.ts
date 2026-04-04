"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");
  return { supabase, user };
}

export type AdminUserActionResult = { ok: true } | { error: string };

export async function archiveUser(userId: string): Promise<AdminUserActionResult> {
  const { supabase, user } = await requireAdmin();
  if (user.id === userId) return { error: "You cannot archive your own account." };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return { error: "User not found." };
  if (target.role === "admin") return { error: "Cannot archive an admin account." };
  const { error } = await supabase
    .from("profiles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("role", "patient");
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/profile-settings");
  return { ok: true };
}

export async function restoreUser(userId: string): Promise<AdminUserActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ archived_at: null })
    .eq("id", userId)
    .eq("role", "patient");
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/users");
  revalidatePath("/dashboard/profile-settings");
  return { ok: true };
}
