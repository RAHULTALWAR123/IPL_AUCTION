import type { SupabaseClient } from "@supabase/supabase-js";

/** Mirrors public.players (catalog). */
export interface PlayerCatalogRow {
  id: number;
  name: string;
  role: string;
  nationality: string;
  is_overseas: boolean;
  base_price: number;
  set_category: string;
  set_order: number;
  matches: number;
  runs: number;
  batting_avg: number | null;
  strike_rate: number | null;
  wickets: number;
  bowling_avg: number | null;
  economy: number | null;
  image_url: string | null;
}

export async function fetchPlayersCatalog(
  client: SupabaseClient
): Promise<{ data: PlayerCatalogRow[]; error: Error | null }> {
  const { data, error } = await client
    .from("players")
    .select(
      "id, name, role, nationality, is_overseas, base_price, set_category, set_order, matches, runs, batting_avg, strike_rate, wickets, bowling_avg, economy, image_url"
    )
    .order("set_category", { ascending: true })
    .order("set_order", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as PlayerCatalogRow[], error: null };
}
