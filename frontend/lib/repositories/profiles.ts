import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/profile";

export async function fetchProfileByUserId(
  client: SupabaseClient,
  userId: string
): Promise<{ data: Profile | null; error: Error | null }> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as Profile, error: null };
}

export async function updateProfileByUserId(
  client: SupabaseClient,
  userId: string,
  updates: Partial<Profile>
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}
