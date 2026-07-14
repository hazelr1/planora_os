/*
# Destination worlds cache (AI Destination World Generator)

Backs the AI-powered Destination World Generator (see
src/destinations/aiWorld.ts and supabase/functions/generate-destination-world)
with a small, shared cache table. Once any user's trip triggers a
generation for a given destination, every other trip — this user's or any
other user's — that resolves to the same destination_key reuses the cached
row instead of paying for another model call. This is deliberately global,
not per-user: the generated content (colors, mood, motif direction, copy)
describes the destination itself, not anything about the trip or the user,
so there is nothing to scope by ownership.

Only the edge function ever writes here (via the service-role client,
after validating the model's output) — clients only ever read through the
edge function's response, never this table directly, though SELECT is
still granted to authenticated users for read-through convenience if a
future feature wants it.
*/

CREATE TABLE IF NOT EXISTS destination_worlds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  profile jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_destination_worlds_key ON destination_worlds(destination_key);

ALTER TABLE destination_worlds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_destination_worlds" ON destination_worlds;
CREATE POLICY "select_destination_worlds" ON destination_worlds FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy for `authenticated` — writes only ever
-- happen through the edge function's service-role client, which bypasses
-- RLS entirely. This keeps the cache's contents guaranteed to have passed
-- through server-side validation (see generate-destination-world/index.ts).
