/*
# Trip template review status

Backs a review gate for AI-generated trip_templates rows before they're
servable to the continent picker: every new row lands as 'pending' and
only becomes visible once explicitly approved (see the batch-generation
review pass run before the Asia/Europe seed pool went live).

The two hand-reviewed proof-of-concept templates (Tokyo Discovery,
Santorini Highlights) predate this column and were already manually
checked before shipping in an earlier round, so they're backfilled
straight to 'approved' rather than starting in the pending queue.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_templates' AND column_name = 'review_status'
  ) THEN
    ALTER TABLE trip_templates ADD COLUMN review_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

ALTER TABLE trip_templates DROP CONSTRAINT IF EXISTS trip_templates_review_status_check;
ALTER TABLE trip_templates ADD CONSTRAINT trip_templates_review_status_check
  CHECK (review_status IN ('pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_trip_templates_review_status ON trip_templates(review_status);
CREATE INDEX IF NOT EXISTS idx_trip_templates_continent_review ON trip_templates(continent, review_status);

-- Backfill: the two existing hand-reviewed proof-of-concept templates were
-- already checked before shipping, so they don't need to sit in the new
-- pending queue behind this migration.
UPDATE trip_templates SET review_status = 'approved' WHERE review_status = 'pending';
