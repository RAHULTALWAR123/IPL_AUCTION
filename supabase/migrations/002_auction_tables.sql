-- Migration: Auction domain tables
-- Description: players catalog, auction_rooms, room_teams, auction_players, bids

-- ============================================================================
-- 1. players — IPL player catalog (~150–200 rows, seeded separately)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.players (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('batsman', 'bowler', 'all_rounder', 'wicket_keeper')),
    nationality TEXT NOT NULL,
    is_overseas BOOLEAN NOT NULL DEFAULT false,
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    set_category TEXT NOT NULL,
    set_order INTEGER NOT NULL DEFAULT 0,
    matches INTEGER NOT NULL DEFAULT 0,
    runs INTEGER NOT NULL DEFAULT 0,
    batting_avg NUMERIC(8,2),
    strike_rate NUMERIC(8,2),
    wickets INTEGER NOT NULL DEFAULT 0,
    bowling_avg NUMERIC(8,2),
    economy NUMERIC(8,2),
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_set ON public.players (set_category, set_order);
CREATE INDEX IF NOT EXISTS idx_players_role ON public.players (role);
CREATE INDEX IF NOT EXISTS idx_players_overseas ON public.players (is_overseas) WHERE is_overseas = true;

DROP TRIGGER IF EXISTS set_updated_at_players ON public.players;
CREATE TRIGGER set_updated_at_players
    BEFORE UPDATE ON public.players
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. auction_rooms — room metadata + live auction state (one active lot per room)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auction_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL UNIQUE,
    host_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('multiplayer', 'ai')),
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_progress', 'completed')),
    current_player_id INTEGER REFERENCES public.players(id) ON DELETE SET NULL,
    current_bid NUMERIC(10,2),
    current_bidder_team_id INTEGER REFERENCES public.ipl_teams(id) ON DELETE SET NULL,
    bid_timer_ends_at TIMESTAMPTZ,
    current_set_index INTEGER NOT NULL DEFAULT 0,
    current_player_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auction_rooms_current_bid_non_negative CHECK (current_bid IS NULL OR current_bid >= 0)
);

CREATE INDEX IF NOT EXISTS idx_auction_rooms_room_code ON public.auction_rooms (room_code);
CREATE INDEX IF NOT EXISTS idx_auction_rooms_host ON public.auction_rooms (host_user_id);
CREATE INDEX IF NOT EXISTS idx_auction_rooms_status ON public.auction_rooms (status);

DROP TRIGGER IF EXISTS set_updated_at_auction_rooms ON public.auction_rooms;
CREATE TRIGGER set_updated_at_auction_rooms
    BEFORE UPDATE ON public.auction_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. room_teams — franchise slot per room (human or AI), per-room budget
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.room_teams (
    id SERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.auction_rooms(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES public.ipl_teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_ai BOOLEAN NOT NULL DEFAULT false,
    budget_remaining NUMERIC(10,2) NOT NULL DEFAULT 100.00 CHECK (budget_remaining >= 0),
    is_connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_room_teams_room ON public.room_teams (room_id);
CREATE INDEX IF NOT EXISTS idx_room_teams_user ON public.room_teams (user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- 4. auction_players — per room × player: order, status, sold/unsold outcome
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auction_players (
    id SERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.auction_rooms(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'current', 'sold', 'unsold')),
    sold_to_team_id INTEGER REFERENCES public.ipl_teams(id) ON DELETE SET NULL,
    sold_price NUMERIC(10,2) CHECK (sold_price IS NULL OR sold_price >= 0),
    auction_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_players_room ON public.auction_players (room_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_room_order ON public.auction_players (room_id, auction_order);
CREATE INDEX IF NOT EXISTS idx_auction_players_room_status ON public.auction_players (room_id, status);

-- ============================================================================
-- 5. bids — append-only bid log per room / player / team
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bids (
    id SERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.auction_rooms(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team_id INTEGER NOT NULL REFERENCES public.ipl_teams(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    is_ai_bid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_room_created ON public.bids (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_room_player ON public.bids (room_id, player_id);

-- ============================================================================
-- 6. Row Level Security
-- ============================================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- players: catalog readable by logged-in users; seed/admin via dashboard or service role
CREATE POLICY "Authenticated users can read players"
    ON public.players
    FOR SELECT
    TO authenticated
    USING (true);

-- auction_rooms
CREATE POLICY "Authenticated users can read auction rooms"
    ON public.auction_rooms
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create rooms they host"
    ON public.auction_rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host or participants can update auction rooms"
    ON public.auction_rooms
    FOR UPDATE
    TO authenticated
    USING (
        host_user_id = auth.uid()
        OR id IN (
            SELECT rt.room_id FROM public.room_teams rt
            WHERE rt.user_id = auth.uid()
        )
    )
    WITH CHECK (
        host_user_id = auth.uid()
        OR id IN (
            SELECT rt.room_id FROM public.room_teams rt
            WHERE rt.user_id = auth.uid()
        )
    );

-- room_teams (multiple permissive INSERT policies are OR'd)
CREATE POLICY "Authenticated users can read room teams"
    ON public.room_teams
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users join room as their franchise"
    ON public.room_teams
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND is_ai = false
    );

CREATE POLICY "Host can add AI team slots"
    ON public.room_teams
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id IS NULL
        AND is_ai = true
        AND EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = room_id
              AND ar.host_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own room team row"
    ON public.room_teams
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Host can update room teams in their room"
    ON public.room_teams
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = room_teams.room_id
              AND ar.host_user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = room_teams.room_id
              AND ar.host_user_id = auth.uid()
        )
    );

-- auction_players
CREATE POLICY "Authenticated users can read auction players"
    ON public.auction_players
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Host can insert auction players for their room"
    ON public.auction_players
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = room_id
              AND ar.host_user_id = auth.uid()
        )
    );

CREATE POLICY "Host or participants can update auction players"
    ON public.auction_players
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = auction_players.room_id
              AND ar.host_user_id = auth.uid()
        )
        OR room_id IN (
            SELECT rt.room_id FROM public.room_teams rt
            WHERE rt.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = auction_players.room_id
              AND ar.host_user_id = auth.uid()
        )
        OR room_id IN (
            SELECT rt.room_id FROM public.room_teams rt
            WHERE rt.user_id = auth.uid()
        )
    );

-- bids
CREATE POLICY "Authenticated users can read bids"
    ON public.bids
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users place bids for their team in room"
    ON public.bids
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_ai_bid = false
        AND EXISTS (
            SELECT 1 FROM public.room_teams rt
            WHERE rt.room_id = room_id
              AND rt.team_id = team_id
              AND rt.user_id = auth.uid()
        )
    );

CREATE POLICY "Host can place AI bids"
    ON public.bids
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_ai_bid = true
        AND EXISTS (
            SELECT 1 FROM public.auction_rooms ar
            WHERE ar.id = room_id
              AND ar.host_user_id = auth.uid()
        )
    );
