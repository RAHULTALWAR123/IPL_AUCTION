# Supabase

Database schema, seeds, and optional data-prep scripts for the IPL Auction app.

## Migrations (`migrations/`)

Apply **in order** in the Supabase SQL editor or with the Supabase CLI:

| File | Purpose |
|------|--------|
| `001_initial_schema.sql` | `ipl_teams`, `profiles`, triggers, RLS for profiles |
| `002_auction_tables.sql` | Auction-related tables (extend as the product grows) |
| `003_drop_ipl_teams_logo.sql` | Drops `ipl_teams.logo`; logos live in `frontend/public` + `lib/ipl-team-assets.ts` |
| `005_create_auction_room_rpc.sql` | `create_auction_room(...)` SECURITY DEFINER RPC (`service_role` only); used by Edge Function |

After migrations, verify **RLS** allows the app to read **`ipl_teams`** and **`players`** (and any other tables the client queries). If the team grid or player list is empty, add or fix `SELECT` policies for the relevant roles (`anon` / `authenticated`).

## Seeds (`seeds/`)

| Artifact | Use |
|----------|-----|
| `players_batters_seed.sql` | Large `INSERT` batch for batters / all-rounders / keepers |
| `players_bowlers_seed.sql` | `INSERT` batch for bowlers |
| `enrich-batters.mjs` | Optional: reads **`ipl_batters_raw.csv`** (you add locally) → enriched CSV + can refresh SQL |
| `enrich-bowlers.mjs` | Optional: **`ipl_bowlers_raw.csv`** (+ batters enriched for dedupe hints) |

Raw and intermediate **CSV files are not committed**. The committed source of truth for seeding the app DB is the **`*.sql`** files once you’re happy with them.

## Edge Functions (`functions/`)

Shared helpers live in [`_shared/`](_shared/) next to `functions/` (HTTP/CORS, internal-secret check, Supabase URL/key resolution). From `functions/<name>/index.ts` import e.g. `../../_shared/http.ts` (use a **`.ts` extension**; Deno).

### `create-auction-room`

Validates header `x-auction-internal-secret` against secret **`AUCTION_INTERNAL_SECRET`**, then calls **`create_auction_room`** with the **service role** client.

**Secrets (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):**

| Name | Purpose |
|------|--------|
| `AUCTION_INTERNAL_SECRET` | Must match `AUCTION_INTERNAL_SECRET` in `frontend/.env.local` / Vercel (Next API sends it in `x-auction-internal-secret`). |
| `SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT for the function’s `createClient` (use one name and align with [index.ts](functions/create-auction-room/index.ts)). |
| `FUNCTION_URL` | Optional if the dashboard blocks custom secrets starting with `SUPABASE_`. Set to your project API URL: `https://<project-ref>.supabase.co` (no trailing slash). The function falls back to `SUPABASE_URL` when the platform provides it. |

**Deploy:**

```bash
cd IPL_AUCTION  # repo root containing supabase/
supabase functions deploy create-auction-room
```

Local invoke is optional; point `frontend/.env.local` at your hosted project URL after deploy.

## Realtime

When auction rooms and bids exist, enable **Realtime** on the tables that should push updates to clients (e.g. lots, bids, room state).

## Local Supabase

[`config.toml`](config.toml) includes a placeholder `project_id`; run `supabase link` for your hosted project. Env vars in `frontend/.env.local` should point at local or hosted URLs accordingly.
