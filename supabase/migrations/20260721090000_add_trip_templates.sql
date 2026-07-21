/*
# Trip templates (suggested trip plans proof of concept)

Backs the "View suggested trip plans" browsing flow with a small set of
curated, non-user-owned itineraries that any authenticated user can browse
and open like a real trip.

1. Tables
   - trip_templates        one row per curated plan (Tokyo, Santorini, ...)
   - template_days         days within a template, same shape as trip_days
   - template_activities   activities within a template day, same shape as
                            activities minus the trip-instance-only columns
                            (is_locked, personal_note, updated_at — a
                            template has no lock state or personal notes of
                            its own; those only make sense once someone has
                            cloned it into a real trip)

2. Ownership model
   This content describes a plan, not anything about a specific user or
   trip — same precedent as destination_worlds (see
   20260714100000_add_destination_worlds_cache.sql): globally shared,
   read-only to every authenticated user, never scoped by ownership.
   Templates are seeded directly (migration / future admin tooling), never
   written by client code, so there is no INSERT/UPDATE/DELETE policy for
   `authenticated` on any of these three tables.

3. Cloning
   trips.cloned_from_template_id records provenance when a user's first
   edit to a template copies it into their own My Trips (see
   supabaseTemplateRepository.cloneTemplateIntoTrip). The template row
   itself is never written to by that flow — only read.
*/

-- ─── trip_templates ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trip_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  destination text NOT NULL,
  country text NOT NULL,
  continent text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  budget numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  travelers integer NOT NULL DEFAULT 1,
  pace text NOT NULL DEFAULT 'Balanced',
  interests text[] NOT NULL DEFAULT '{}',
  special_requests text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_templates_continent ON trip_templates(continent);
CREATE INDEX IF NOT EXISTS idx_trip_templates_country ON trip_templates(country);

-- ─── template_days ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS template_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES trip_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  date date NOT NULL,
  theme text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_template_days_template_id ON template_days(template_id, sort_order);

-- ─── template_activities ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS template_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id uuid NOT NULL REFERENCES template_days(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES trip_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 60,
  estimated_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  category text NOT NULL DEFAULT 'Other',
  ai_reason text NOT NULL DEFAULT '',
  latitude numeric,
  longitude numeric,
  cost_confidence text NOT NULL DEFAULT 'medium',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_template_activities_template_id ON template_activities(template_id);
CREATE INDEX IF NOT EXISTS idx_template_activities_day_id ON template_activities(template_day_id, sort_order);

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE trip_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_trip_templates" ON trip_templates;
CREATE POLICY "select_trip_templates" ON trip_templates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "select_template_days" ON template_days;
CREATE POLICY "select_template_days" ON template_days FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "select_template_activities" ON template_activities;
CREATE POLICY "select_template_activities" ON template_activities FOR SELECT
  TO authenticated USING (true);

-- ─── Provenance on trips ─────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trips' AND column_name = 'cloned_from_template_id'
  ) THEN
    ALTER TABLE trips ADD COLUMN cloned_from_template_id uuid REFERENCES trip_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trips_cloned_from_template_id ON trips(cloned_from_template_id);
