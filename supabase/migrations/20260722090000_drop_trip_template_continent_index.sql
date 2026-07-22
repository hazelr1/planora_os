/*
# Drop unused continent+review_status index

The suggested-trip-plans browser no longer has a continent step — it now
lists a random sample of the whole approved pool (WHERE review_status =
'approved' ORDER BY random() LIMIT 15), so the composite index anticipating
a `WHERE continent = ? AND review_status = ?` query pattern is dead weight.
The plain review_status index (idx_trip_templates_review_status, added in
the same migration) already covers the query this app actually runs.

The `continent` column itself is untouched — it's still authored per
template and still shown on TemplateCard, just no longer filtered on.
*/

DROP INDEX IF EXISTS idx_trip_templates_continent_review;
