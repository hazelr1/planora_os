/*
# Trip files storage (Documents & Gallery)

Backs the Workspace's new Documents and Gallery sections with a single
private Storage bucket. Objects are stored at the path:

  {auth.uid()}/{trip_id}/{filename}

so ownership can be enforced purely from the path (no join needed) using
Supabase's standard storage.foldername() RLS pattern. The `gallery/` vs
`documents/` distinction is a filename prefix convention handled entirely
in the application, not the database — both live in the same bucket.

RLS mirrors the rest of this schema: a user may only read/write objects
under their own auth.uid() folder.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-files', 'trip-files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "select_own_trip_files" ON storage.objects;
CREATE POLICY "select_own_trip_files" ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'trip-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "insert_own_trip_files" ON storage.objects;
CREATE POLICY "insert_own_trip_files" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'trip-files' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "delete_own_trip_files" ON storage.objects;
CREATE POLICY "delete_own_trip_files" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'trip-files' AND (storage.foldername(name))[1] = auth.uid()::text);
