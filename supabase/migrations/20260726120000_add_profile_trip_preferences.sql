/*
# Profile trip preferences

Wires up the existing (but until now unused-beyond-name-mirroring) profiles
table to store a lightweight, rolling snapshot of a traveler's preferences,
derived from whichever trip they most recently created or edited:
  - pace: 'slow' | 'moderate' | 'packed', from the trip's own travel_pace.
  - travels_with_kids: 'yes' | 'no', a keyword heuristic over the trip's own
    free text (special requests / pasted trip idea).
  - budget_tier: 'budget' | 'mid-range' | 'luxury', from budget per
    traveler per day.

A single jsonb column rather than three dedicated ones: this is
deliberately a loose, evolving bag of short tags (see
src/lib/tripPreferences.ts and each edge function's own derivation step),
not a fixed schema — new tags should be addable without another migration.
Nullable keys within it (a trip edit might only ever produce one of the
three tags) are merged onto whatever was already there rather than
overwriting the whole object, so partial signal never erases the rest.

Read back by generate-itinerary (and generate-trip-from-text) before
calling the AI, and surfaced to the user as a small "Using your
preferences" badge in the trip-creation flow — see PreferencesBadge.tsx.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='preferences') THEN
    ALTER TABLE profiles ADD COLUMN preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
