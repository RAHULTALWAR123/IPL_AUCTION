# IPL Auction

Web app for an IPL-style fantasy auction: sign in, pick a franchise, then (in future milestones) run AI or multiplayer auctions and build a squad.

## Status

| Area | Done | Next |
|------|------|------|
| **Auth** | Email/password sign-up, login, forgot/reset password (Supabase Auth) | Session refresh hardening, optional OAuth |
| **Profile / teams** | Profile row in Postgres; select one of 10 IPL teams; dashboard shows **team name + logo** (static assets in `frontend/public`) | — |
| **Auction entry** | Dashboard links to **`/auction/mode`** with **UI-only** choice: AI vs multiplayer | Persist mode, rooms, realtime bidding |
| **Data** | `ipl_teams`, `players` catalog, profile `selected_team_id`, budget, squad JSON | Auction state, picks, leaderboards |
| **AI / realtime** | Not wired | Gemini or other AI bidders; Supabase Realtime on auction tables |

## Project structure

```
IPL_AUCTION/
├── frontend/                 # Next.js app (App Router)
│   ├── app/                  # Routes: /, /login, /signup, /select-team, /dashboard, /auction/mode, …
│   ├── components/           # UI + team picker, aceternity landing
│   ├── hooks/                # useIplTeams, useIplTeamById, usePlayersCatalog, …
│   ├── lib/
│   │   ├── repositories/     # Supabase reads/writes (no raw client calls scattered in pages)
│   │   ├── ipl-team-assets.ts # short_name → public logo path
│   │   └── supabase/         # browser + server clients
│   └── store/                # Zustand auth + profile
├── supabase/
│   ├── migrations/           # Ordered SQL: schema, auction tables, logo column drop
│   ├── seeds/               # Player INSERT scripts + optional enrich-*.mjs (CSVs not committed)
│   └── README.md            # Supabase-focused notes
└── README.md
```

## Tech stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn-style UI, Framer Motion (landing), Lucide icons
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **State**: Zustand (`auth-store` + profile sync)
- **Deployment** (typical): Vercel (frontend) + hosted Supabase

Planned: **Supabase Realtime** for live auctions; optional **AI** bidders once the auction engine exists.

## Getting started

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` with your Supabase project values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations in `supabase/migrations/` **in order** in the SQL editor (or via Supabase CLI).
3. Ensure **authenticated (and if needed anon) users can `SELECT` on `ipl_teams` and `players`** so the team grid and catalogs load (add/adjust RLS policies if tables appear empty in the app).
4. Optional: run `supabase/seeds/*.sql` in the SQL editor to seed the `players` table after `players` exists in your schema.

Details: [supabase/README.md](./supabase/README.md).

## User flow (current build)

1. **Landing** (`/`) → marketing hero.
2. **Auth** → `login`, `signup`, `forgot-password`, `reset-password`.
3. **Team** → `select-team` loads `ipl_teams`, user picks a franchise; profile stores `selected_team_id`.
4. **Dashboard** → welcome, franchise card (name + logo), budget, squad count; **Change team**; **Choose auction mode** → `auction/mode`.
5. **Auction mode** → pick AI or multiplayer (visual only today); Continue stub returns to dashboard until rooms are implemented.

## Features implemented

- Supabase email auth and profile CRUD via repositories + Zustand
- IPL team catalog and team selection persisted on profile
- Player catalog hook/repository for future auction UI
- Dashboard + auction mode placeholder page
- Static franchise logos mapped by `short_name` (not stored in DB after migration `003`)

## Features planned

- Auction rooms (create/join), realtime bids, timers, turn order
- AI opponents for single-player mode
- Multiplayer presence and squad persistence beyond JSON stub

## Scripts

| Command | Where |
|---------|--------|
| `npm run dev` / `build` / `start` | `frontend/` |
| `node supabase/seeds/enrich-batters.mjs` | Regenerates batters CSV/SQL **if** you add `ipl_batters_raw.csv` locally (CSVs not in repo) |
| `node supabase/seeds/enrich-bowlers.mjs` | Same for bowlers |

## License

Private / all rights reserved unless you add a license file.
