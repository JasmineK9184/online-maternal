"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const dateOrEmpty = z
  .string()
  .optional()
  .nullable()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date");

const profileSchema = z.object({
  full_name: z.string().optional(),
  phone: z.string().optional().nullable(),
  due_date: dateOrEmpty,
  lmp_date: dateOrEmpty,
});

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const empty = (v: string | null | undefined) =>
    !v || String(v).trim() === "" ? null : String(v).trim();

  const due = empty(parsed.data.due_date as string | undefined);
  const lmp = empty(parsed.data.lmp_date as string | undefined);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: empty(parsed.data.full_name) || null,
      phone: empty(parsed.data.phone as string | undefined),
      due_date: due,
      lmp_date: lmp,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function saveProfileForm(formData: FormData) {
  const result = await updateProfile({
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? "") || null,
    due_date: String(formData.get("due_date") ?? "") || null,
    lmp_date: String(formData.get("lmp_date") ?? "") || null,
  });

  if ("error" in result && result.error) {
    const msg =
      typeof result.error === "string"
        ? result.error
        : "Please check your details (dates should be YYYY-MM-DD).";
    const enc = encodeURIComponent(msg.slice(0, 200));
    redirect(`/dashboard/health-profile?error=${enc}`);
  }

  redirect("/dashboard/health-profile?saved=1");
}
