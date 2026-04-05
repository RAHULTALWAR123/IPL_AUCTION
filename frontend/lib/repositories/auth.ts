import { createClient } from "@/lib/supabase/client";

/** Password recovery: exchange ?code= from email link for a session. */
export async function exchangeAuthCodeForSession(code: string) {
  const supabase = createClient();
  return supabase.auth.exchangeCodeForSession(code);
}
