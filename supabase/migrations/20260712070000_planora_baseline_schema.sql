/*
# Planora baseline schema

Consolidated baseline for the Planora trip-itinerary app, reconstructed from
the application's Supabase repository files (under src/data/repositories/supabase)
and edge functions (under supabase/functions), which are the source of truth
for actual column names and shapes used against the database.

1. Tables
   - profiles        one row per auth.users, keyed by the same id
   - trips           a user's trips
   - trip_days       days within a trip
   - activities      activities within a trip day (denormalized trip_id for
                      direct per-trip queries without a join through trip_days)
   - ai_revisions    AI-proposed itinerary revisions for a trip

2. Ownership model
   - profiles.id / trips.user_id are the ownership anchors, tied to auth.uid().
   - trip_days, activities, ai_revisions are owned indirectly through the
     trip they belong to (trip_id -> trips.user_id).

3. Security
   - RLS enabled on all five tables.
   - Every policy scopes rows to the authenticated owner, either directly
     (profiles, trips) or via an EXISTS join on trips (trip_days, activities,
     ai_revisions).
*/

-- ─── profiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── trips ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  budget numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  travelers integer NOT NULL DEFAULT 1,
  pace text NOT NULL DEFAULT 'Balanced',
  interests text[] NOT NULL DEFAULT '{}',
  special_requests text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Planning',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_demo boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  public_slug text
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- ─── trip_days ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label text NOT NULL,
  date date NOT NULL,
  theme text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id, sort_order);

-- ─── activities ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_day_id uuid NOT NULL REFERENCES trip_days(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 60,
  estimated_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  category text NOT NULL DEFAULT 'Other',
  ai_reason text NOT NULL DEFAULT '',
  is_locked boolean NOT NULL DEFAULT false,
  personal_note text NOT NULL DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_trip_id ON activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_trip_day_id ON activities(trip_day_id, sort_order);

-- ─── ai_revisions ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  summary text NOT NULL DEFAULT '',
  before_json jsonb,
  proposed_json jsonb,
  budget_difference numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_revisions_trip_id ON ai_revisions(trip_id);
CREATE INDEX IF NOT EXISTS idx_ai_revisions_user_id ON ai_revisions(user_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_revisions ENABLE ROW LEVEL SECURITY;

-- profiles: id IS the auth.uid() of the owner

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- trips: user_id = auth.uid()

DROP POLICY IF EXISTS "select_own_trips" ON trips;
CREATE POLICY "select_own_trips" ON trips FOR SELECT
  TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_trips" ON trips;
CREATE POLICY "insert_own_trips" ON trips FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_trips" ON trips;
CREATE POLICY "update_own_trips" ON trips FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_trips" ON trips;
CREATE POLICY "delete_own_trips" ON trips FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- trip_days: owned via trips.user_id

DROP POLICY IF EXISTS "select_own_trip_days" ON trip_days;
CREATE POLICY "select_own_trip_days" ON trip_days FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_trip_days" ON trip_days;
CREATE POLICY "insert_own_trip_days" ON trip_days FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_trip_days" ON trip_days;
CREATE POLICY "update_own_trip_days" ON trip_days FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_trip_days" ON trip_days;
CREATE POLICY "delete_own_trip_days" ON trip_days FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_days.trip_id AND trips.user_id = auth.uid())
  );

-- activities: owned via trips.user_id (trip_id is denormalized onto the row)

DROP POLICY IF EXISTS "select_own_activities" ON activities;
CREATE POLICY "select_own_activities" ON activities FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activities.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_activities" ON activities;
CREATE POLICY "insert_own_activities" ON activities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activities.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_activities" ON activities;
CREATE POLICY "update_own_activities" ON activities FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activities.trip_id AND trips.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activities.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_activities" ON activities;
CREATE POLICY "delete_own_activities" ON activities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = activities.trip_id AND trips.user_id = auth.uid())
  );

-- ai_revisions: owned via trips.user_id (also carries its own user_id, set by
-- the edge function, but ownership is enforced through the trip join so a
-- forged user_id at insert time can't grant access to someone else's trip)

DROP POLICY IF EXISTS "select_own_ai_revisions" ON ai_revisions;
CREATE POLICY "select_own_ai_revisions" ON ai_revisions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = ai_revisions.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "insert_own_ai_revisions" ON ai_revisions;
CREATE POLICY "insert_own_ai_revisions" ON ai_revisions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = ai_revisions.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "update_own_ai_revisions" ON ai_revisions;
CREATE POLICY "update_own_ai_revisions" ON ai_revisions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = ai_revisions.trip_id AND trips.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = ai_revisions.trip_id AND trips.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "delete_own_ai_revisions" ON ai_revisions;
CREATE POLICY "delete_own_ai_revisions" ON ai_revisions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = ai_revisions.trip_id AND trips.user_id = auth.uid())
  );
