# Supabase Configuration

This folder will contain Supabase-related files:

- **migrations/** - Database migration files (SQL). Apply in order: `001_initial_schema.sql`, then `002_auction_tables.sql` (`players`, `auction_rooms`, `room_teams`, `auction_players`, `bids`). Enable **Realtime** on those tables in the dashboard when you wire live updates.
- **functions/** - Edge functions (if needed)
- **config.toml** - Supabase local development configuration

## Setup

(To be configured when Supabase project is initialized)
