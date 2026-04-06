/** Resolve Supabase project URL and service role for admin clients in Edge. */

export function resolveEdgeSupabaseUrl(): string | undefined {
  const fromCustom = Deno.env.get("FUNCTION_URL")?.replace(/\/$/, "");
  const fromPlatform = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  return fromCustom ?? fromPlatform;
}

export function resolveEdgeServiceRoleKey(): string | undefined {
  return (
    Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
}
