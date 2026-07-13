import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET = 'trip-files';
const SIGNED_URL_TTL_SECONDS = 3600;

export interface TripFile {
  name: string;
  path: string;
  url: string;
  size: number;
  createdAt: string;
}

async function folderPath(tripId: string, kind: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return `${user.id}/${tripId}/${kind}`;
}

/**
 * Lists, uploads, and deletes files for a trip in a given category
 * ("documents" or "gallery"), backed by the private `trip-files` Storage
 * bucket. Objects are namespaced as {auth.uid()}/{tripId}/{kind}/{filename},
 * which is also how the bucket's RLS policies scope access — only the
 * owning user's folder is ever readable or writable.
 */
export function useTripFiles(tripId: string, kind: 'documents' | 'gallery') {
  const [files, setFiles] = useState<TripFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const folder = await folderPath(tripId, kind);
    if (!folder) { setError('Session expired. Please sign in again.'); setLoading(false); return; }

    const { data, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(folder, { sortBy: { column: 'created_at', order: 'desc' } });

    if (listErr) { setError(listErr.message); setLoading(false); return; }

    const items = (data ?? []).filter((f) => f.id);
    const withUrls = await Promise.all(items.map(async (f): Promise<TripFile> => {
      const path = `${folder}/${f.name}`;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return {
        name: f.name,
        path,
        url: signed?.signedUrl ?? '',
        size: (f.metadata as { size?: number } | null)?.size ?? 0,
        createdAt: f.created_at ?? '',
      };
    }));

    setFiles(withUrls);
    setLoading(false);
  }, [tripId, kind]);

  useEffect(() => { void refresh(); }, [refresh]);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    const folder = await folderPath(tripId, kind);
    if (!folder) { setError('Session expired. Please sign in again.'); setUploading(false); return; }

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(`${folder}/${safeName}`, file);
    setUploading(false);
    if (uploadErr) { setError(uploadErr.message); return; }
    await refresh();
  }, [tripId, kind, refresh]);

  const remove = useCallback(async (path: string) => {
    const snapshot = files;
    setFiles((prev) => prev.filter((f) => f.path !== path));
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove([path]);
    if (removeErr) { setError(removeErr.message); setFiles(snapshot); }
  }, [files]);

  return { files, loading, uploading, error, upload, remove, refresh };
}
