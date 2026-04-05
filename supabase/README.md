# Supabase

Database schema, seeds, and optional data-prep scripts for the IPL Auction app.

## Migrations (`migrations/`)

Apply **in order** in the Supabase SQL editor or with the Supabase CLI:

| File | Purpose |
|------|--------|
| `001_initial_schema.sql` | `ipl_teams`, `profiles`, triggers, RLS for profiles |
| `002_auction_tables.sql` | Auction-related tables (extend as the product grows) |
| `003_drop_ipl_teams_logo.sql` | Drops `ipl_teams.logo`; logos live in `frontend/public` + `lib/ipl-team-assets.ts` |

After migrations, verify **RLS** allows the app to read **`ipl_teams`** and **`players`** (and any other tables the client queries). If the team grid or player list is empty, add or fix `SELECT` policies for the relevant roles (`anon` / `authenticated`).

## Seeds (`seeds/`)

| Artifact | Use |
|----------|-----|
| `players_batters_seed.sql` | Large `INSERT` batch for batters / all-rounders / keepers |
| `players_bowlers_seed.sql` | `INSERT` batch for bowlers |
| `enrich-batters.mjs` | Optional: reads **`ipl_batters_raw.csv`** (you add locally) → enriched CSV + can refresh SQL |
| `enrich-bowlers.mjs` | Optional: **`ipl_bowlers_raw.csv`** (+ batters enriched for dedupe hints) |

Raw and intermediate **CSV files are not committed**. The committed source of truth for seeding the app DB is the **`*.sql`** files once you’re happy with them.

## Realtime

When auction rooms and bids exist, enable **Realtime** on the tables that should push updates to clients (e.g. lots, bids, room state).

## Local Supabase

`config.toml` can be added for `supabase start` local development if you use the Supabase CLI; env vars in `frontend/.env.local` should point at local or hosted URLs accordingly.
