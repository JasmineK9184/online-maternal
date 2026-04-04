import { createServiceClient } from "@/lib/supabase/admin";

/** Auth user emails keyed by id (paginated). Server-only; call only after verifying admin. */
export async function emailsByUserId(): Promise<Map<string, string>> {
  const admin = createServiceClient();
  const map = new Map<string, string>();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email) map.set(u.id, u.email);
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return map;
}
