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
| `006_domain_enum_types.sql` | `player_role`, `auction_room_mode`, `auction_room_status`, `auction_player_status` enums on `players.role`, `auction_rooms.mode` / `status`, `auction_players.status` |
| `007_room_teams_one_user_per_room.sql` | Partial unique index `room_teams_one_user_per_room` on `(room_id, user_id)` where `user_id IS NOT NULL` — at most one human seat per user per room |

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
| `SUPABASE_URL` | Project API URL (often injected automatically on hosted Supabase). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT for the function’s `createClient`. |

**Deploy:**

```bash
cd IPL_AUCTION  # repo root containing supabase/
supabase functions deploy create-auction-room
```

From the same directory, **`supabase functions deploy`** (no function name) deploys every function under `supabase/functions/`; the GitHub workflow uses that.

Local invoke is optional; point `frontend/.env.local` at your hosted project URL after deploy.

### `join-auction-room`

Validates `x-auction-internal-secret`, then uses the **service role** client to load the room (must be **lobby**), verify the caller’s **profile `selected_team_id`** matches the requested franchise, and **insert** into `room_teams`. No Postgres RPC — logic is in TypeScript. Handles duplicate membership / franchise conflicts (including valid Postgres **23505** from `room_teams` unique constraints).

Uses the same secrets as **`create-auction-room`** (`AUCTION_INTERNAL_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`).

**Deploy:**

```bash
cd IPL_AUCTION
supabase functions deploy join-auction-room
```

The Next route `POST /api/auctions/rooms/join` (session + profile) calls this function with **`roomCode`**, **`userId`**, and **`teamId`** from the server.

### `leave-auction-room`

Validates `x-auction-internal-secret`, then uses the **service role** client so users can **delete** or **update** `room_teams` (RLS does not grant client DELETE). Behavior:

- **`lobby`:** deletes the caller’s seat row (franchise opens for another join).
- **`in_progress`:** sets that seat to AI (`user_id` null, `is_ai` true).
- If the leaver is **`auction_rooms.host_user_id`**, **reassigns** `host_user_id` to the remaining human with the smallest `room_teams.id`, or sets the room to **`completed`** if none.

Uses the same secrets as **`create-auction-room`**.

**Deploy:**

```bash
cd IPL_AUCTION
supabase functions deploy leave-auction-room
```

The Next route `POST /api/auctions/rooms/leave` (session cookie) calls this function with **`roomCode`** and **`userId`**.

## Realtime

When auction rooms and bids exist, enable **Realtime** on the tables that should push updates to clients (e.g. lots, bids, room state).

## Local Supabase

[`config.toml`](config.toml) includes a placeholder `project_id`; run `supabase link` for your hosted project. Env vars in `frontend/.env.local` should point at local or hosted URLs accordingly.
