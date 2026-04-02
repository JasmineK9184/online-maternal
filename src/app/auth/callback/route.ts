import { NextResponse } from "next/server";
import { encryptRefreshToken } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(`${origin}/`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const refresh = data.session.provider_refresh_token;
      const userId = data.session.user.id;
      if (refresh && userId) {
        try {
          const enc = encryptRefreshToken(refresh);
          const admin = createServiceClient();
          await admin.from("user_google_tokens").upsert({
            user_id: userId,
            encrypted_refresh_token: enc.ciphertext,
            token_iv: enc.iv,
            auth_tag: enc.authTag,
            updated_at: new Date().toISOString(),
          });
        } catch (e) {
          console.error("Token store failed:", e);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
