-- Domain enums for closed value sets (replacing TEXT + CHECK).
-- Apply after 002 (table definitions) and 005 (RPC still passes TEXT; inserts coerce to enum).

CREATE TYPE public.player_role AS ENUM (
  'batsman',
  'bowler',
  'all_rounder',
  'wicket_keeper'
);

CREATE TYPE public.auction_room_mode AS ENUM (
  'multiplayer',
  'ai'
);

CREATE TYPE public.auction_room_status AS ENUM (
  'lobby',
  'in_progress',
  'completed'
);

CREATE TYPE public.auction_player_status AS ENUM (
  'pending',
  'current',
  'sold',
  'unsold'
);

-- Drop inline CHECK constraints from 002 (PostgreSQL names them table_column_check).
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_role_check;

ALTER TABLE public.auction_rooms DROP CONSTRAINT IF EXISTS auction_rooms_mode_check;
ALTER TABLE public.auction_rooms DROP CONSTRAINT IF EXISTS auction_rooms_status_check;

ALTER TABLE public.auction_players DROP CONSTRAINT IF EXISTS auction_players_status_check;

ALTER TABLE public.players
  ALTER COLUMN role TYPE public.player_role
  USING role::public.player_role;

ALTER TABLE public.auction_rooms
  ALTER COLUMN mode TYPE public.auction_room_mode
  USING mode::public.auction_room_mode;

-- Refresh defaults that were text literals.
ALTER TABLE public.auction_rooms ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.auction_rooms
  ALTER COLUMN status TYPE public.auction_room_status
  USING status::public.auction_room_status;
ALTER TABLE public.auction_rooms
  ALTER COLUMN status SET DEFAULT 'lobby'::public.auction_room_status;

ALTER TABLE public.auction_players ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.auction_players
  ALTER COLUMN status TYPE public.auction_player_status
  USING status::public.auction_player_status;
ALTER TABLE public.auction_players
  ALTER COLUMN status SET DEFAULT 'pending'::public.auction_player_status;
