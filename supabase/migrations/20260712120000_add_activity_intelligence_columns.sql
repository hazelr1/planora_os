/*
# Activity intelligence columns

Supports the AI Travel Copilot upgrade:
- latitude / longitude: best-effort coordinates (AI-estimated at generation
  time) used to plot activities on the embedded map. Nullable — older rows
  and activities the AI couldn't place confidently are simply not mapped.
- cost_confidence: how confident the AI is in `estimated_cost` ('low',
  'medium', 'high'), shown as a badge on the activity card.
- updated_at: last-edited timestamp, set by the application on every
  activity update, mirroring the existing trips.last_updated /
  profiles.updated_at pattern (no DB trigger).

All additions are idempotent via DO $$ IF NOT EXISTS blocks, consistent with
this project's existing migration style for additive schema changes.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='latitude') THEN
    ALTER TABLE activities ADD COLUMN latitude numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='longitude') THEN
    ALTER TABLE activities ADD COLUMN longitude numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='cost_confidence') THEN
    ALTER TABLE activities ADD COLUMN cost_confidence text NOT NULL DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='updated_at') THEN
    ALTER TABLE activities ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;
