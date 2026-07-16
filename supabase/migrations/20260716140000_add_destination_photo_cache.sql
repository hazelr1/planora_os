/*
# Destination photo cache

Extends destination_worlds (see 20260714100000_add_destination_worlds_cache.sql)
with the resolved photo for each destination, so a real photo is looked up
from Pexels/Pixabay at most once per destination — globally, across every
user's trips — rather than on every render or every session. Same ownership
model as the rest of that table: only the edge function's service-role
client ever writes here; clients only ever read through the edge function.

Columns:
- photo_url: the resolved image URL, or NULL if no photo could be found
  (a resolved-but-empty result is still cached — see photo_resolved_at).
- photo_source: 'pexels' | 'pixabay' | 'curated' | NULL — which source the
  photo came from, or NULL if nothing resolved. Needed both for the
  attribution UI (Pexels' API terms require a visible credit/link; Pixabay's
  don't require per-photo attribution but do require indicating the source)
  and for cache-lifetime policy below.
- photo_photographer / photo_photographer_url: photographer credit, when the
  source API provided one. NULL for curated/local images and for sources
  that didn't return photographer info.
- photo_resolved_at: when this row's photo fields were last (re)resolved.
  Also the field that tells the edge function whether a row has been tried
  before at all, distinct from "tried and found nothing" (photo_url NULL
  with photo_resolved_at set) versus "never attempted" (photo_resolved_at
  NULL). Pexels/curated results are cached indefinitely once resolved;
  Pixabay's API terms disallow permanent hotlinking of their CDN URLs, so
  the edge function treats photo_source = 'pixabay' rows as stale after 24h
  and re-resolves them rather than serving the same URL forever.
*/

-- A destination's photo can now be resolved (and cached) before its AI world
-- profile ever is, or vice versa — resolve-destination-photo may be the
-- first thing to ever create a row for a given destination_key. `profile`
-- was NOT NULL because every row used to come from generate-destination-world,
-- which always had one to write; relaxed here so a photo-only row is valid.
-- generate-destination-world's own cache check (`if (cached?.profile)`)
-- already treats NULL as "no cached profile yet", so this is safe as-is.
ALTER TABLE destination_worlds ALTER COLUMN profile DROP NOT NULL;

ALTER TABLE destination_worlds ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE destination_worlds ADD COLUMN IF NOT EXISTS photo_source text;
ALTER TABLE destination_worlds ADD COLUMN IF NOT EXISTS photo_photographer text;
ALTER TABLE destination_worlds ADD COLUMN IF NOT EXISTS photo_photographer_url text;
ALTER TABLE destination_worlds ADD COLUMN IF NOT EXISTS photo_resolved_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'destination_worlds_photo_source_check'
  ) THEN
    ALTER TABLE destination_worlds
      ADD CONSTRAINT destination_worlds_photo_source_check
      CHECK (photo_source IS NULL OR photo_source IN ('pexels', 'pixabay', 'curated'));
  END IF;
END $$;
