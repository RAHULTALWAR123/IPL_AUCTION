-- Migration: Initial Schema
-- Description: Creates ipl_teams and profiles tables with seed data, triggers, and RLS policies

-- ============================================================================
-- 1. Create ipl_teams table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ipl_teams (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL UNIQUE,
    logo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. Insert seed data for 10 IPL teams
-- ============================================================================

INSERT INTO public.ipl_teams (name, short_name, logo) VALUES
    ('Mumbai Indians', 'MI', NULL),
    ('Chennai Super Kings', 'CSK', NULL),
    ('Royal Challengers Bangalore', 'RCB', NULL),
    ('Kolkata Knight Riders', 'KKR', NULL),
    ('Delhi Capitals', 'DC', NULL),
    ('Punjab Kings', 'PBKS', NULL),
    ('Rajasthan Royals', 'RR', NULL),
    ('Sunrisers Hyderabad', 'SRH', NULL),
    ('Gujarat Titans', 'GT', NULL),
    ('Lucknow Super Giants', 'LSG', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. Create profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    selected_team_id INTEGER REFERENCES public.ipl_teams(id) ON DELETE SET NULL,
    squad JSONB DEFAULT '[]'::jsonb NOT NULL,
    budget NUMERIC(10,2) DEFAULT 100.00 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT budget_non_negative CHECK (budget >= 0)
);

-- ============================================================================
-- 4. Create indexes
-- ============================================================================

-- Index on email for lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Index on selected_team_id for team-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_selected_team_id ON public.profiles(selected_team_id);

-- GIN index on squad JSONB column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_profiles_squad ON public.profiles USING GIN (squad);

-- ============================================================================
-- 5. Create updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Create triggers for updated_at
-- ============================================================================

-- Trigger for profiles.updated_at
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for ipl_teams.updated_at
CREATE TRIGGER set_updated_at_ipl_teams
    BEFORE UPDATE ON public.ipl_teams
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. Create function to auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Create trigger for profile creation
-- ============================================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. Enable RLS on profiles table
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 10. Create RLS policies
-- ============================================================================

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Users can insert their own profile (backup, though trigger handles it)
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy: Public read access for selected_team_id and name (for displaying in rooms)
-- This allows other users to see which team a user selected and their name in auction rooms
-- Note: RLS policies apply to entire rows. For column-level restrictions, consider creating a view.
CREATE POLICY "Public can view team selection and name"
    ON public.profiles
    FOR SELECT
    USING (true);
