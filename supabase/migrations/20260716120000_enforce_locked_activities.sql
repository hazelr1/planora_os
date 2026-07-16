/*
# Enforce locked activities at the database layer

Locking an activity was previously only a UI convention and an AI-prompt
instruction — nothing stopped a direct UPDATE/DELETE (via the anon-key
client, or a future edge function bug) from modifying or removing a locked
row. This adds a database-level backstop that holds regardless of which
client or key performs the write, including the apply-itinerary-revision
edge function's service-role client, which bypasses RLS.

Blocked while `is_locked = true`:
- DELETE of the row.
- UPDATE of any content field (title, description, time, location,
  duration_minutes, estimated_cost, currency, category, ai_reason) or a
  move to a different trip_day_id.

Deliberately NOT blocked: sort_order changing on its own. Drag-and-drop
reorder (reorderDay) renumbers sort_order for every activity in a day —
including locked ones acting as fixed anchors — whenever any *other*
activity in that day is dragged. Blocking bare sort_order changes would
break that existing reorder-around-a-locked-anchor behavior. Unlocking an
activity (is_locked flips to false in the same statement) is always
allowed, so a user can unlock then edit/move/delete normally.
*/

CREATE OR REPLACE FUNCTION enforce_locked_activity()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_locked THEN
      RAISE EXCEPTION 'Cannot delete locked activity "%": unlock it first.', OLD.title;
    END IF;
    RETURN OLD;
  END IF;

  -- TG_OP = 'UPDATE'
  IF OLD.is_locked AND NEW.is_locked THEN
    IF NEW.trip_day_id IS DISTINCT FROM OLD.trip_day_id
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.time IS DISTINCT FROM OLD.time
      OR NEW.location IS DISTINCT FROM OLD.location
      OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
      OR NEW.estimated_cost IS DISTINCT FROM OLD.estimated_cost
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.ai_reason IS DISTINCT FROM OLD.ai_reason
    THEN
      RAISE EXCEPTION 'Cannot modify locked activity "%": unlock it first.', OLD.title;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_locked_activity_update ON activities;
CREATE TRIGGER enforce_locked_activity_update
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_locked_activity();

DROP TRIGGER IF EXISTS enforce_locked_activity_delete ON activities;
CREATE TRIGGER enforce_locked_activity_delete
  BEFORE DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_locked_activity();
