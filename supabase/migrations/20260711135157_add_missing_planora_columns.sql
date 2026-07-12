/*
# Add missing columns to Planora tables

## Changes
1. trips: add is_demo, is_public, public_slug
2. activities: add currency column (inherits from trip by default)
3. ai_revisions: add before_json, proposed_json, budget_difference, decided_at
4. trips: ensure DEFAULT auth.uid() on user_id (already set)

All additions are idempotent via DO $$ IF NOT EXISTS blocks.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trips' AND column_name='is_demo') THEN
    ALTER TABLE trips ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trips' AND column_name='is_public') THEN
    ALTER TABLE trips ADD COLUMN is_public boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='trips' AND column_name='public_slug') THEN
    ALTER TABLE trips ADD COLUMN public_slug text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='activities' AND column_name='currency') THEN
    ALTER TABLE activities ADD COLUMN currency text NOT NULL DEFAULT 'USD';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_revisions' AND column_name='before_json') THEN
    ALTER TABLE ai_revisions ADD COLUMN before_json jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_revisions' AND column_name='proposed_json') THEN
    ALTER TABLE ai_revisions ADD COLUMN proposed_json jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_revisions' AND column_name='budget_difference') THEN
    ALTER TABLE ai_revisions ADD COLUMN budget_difference numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_revisions' AND column_name='decided_at') THEN
    ALTER TABLE ai_revisions ADD COLUMN decided_at timestamptz;
  END IF;
END $$;
