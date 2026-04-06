/** Resolve Supabase project URL and service role for admin clients in Edge. */

export function resolveEdgeSupabaseUrl(): string | undefined {
  return Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
}

export function resolveEdgeServiceRoleKey(): string | undefined {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
