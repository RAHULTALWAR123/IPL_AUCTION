import type { SupabaseClient } from "@supabase/supabase-js";

export interface IplTeamRow {
  id: number;
  name: string;
  short_name: string;
}

export async function fetchIplTeams(
  client: SupabaseClient
): Promise<{ data: IplTeamRow[]; error: Error | null }> {
  const { data, error } = await client
    .from("ipl_teams")
    .select("id, name, short_name")
    .order("name");

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as IplTeamRow[], error: null };
}

export async function fetchIplTeamById(
  client: SupabaseClient,
  id: number
): Promise<{ data: IplTeamRow | null; error: Error | null }> {
  const { data, error } = await client
    .from("ipl_teams")
    .select("id, name, short_name")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as IplTeamRow | null, error: null };
}
