/**
 * Real destination photography — a progressive enhancement layered on top
 * of the procedural gradient/motif system in src/destinations/. That system
 * remains the permanent fallback: this module only ever *adds* a photo on
 * top of it, and resolves to null (never throws) whenever a photo can't be
 * found, so every caller works unchanged with zero API keys configured.
 *
 * Resolution order:
 *   1. Curated — a small fixed set of hand-picked local images for the
 *      hackathon demo destinations (Tokyo, Lisbon, Queenstown). Checked
 *      first and purely locally: no network call, so these three never
 *      depend on Pexels/Pixabay/Supabase being reachable during a demo.
 *   2. Pexels, then Pixabay — resolved and cached server-side (see
 *      supabase/functions/resolve-destination-photo), so a given
 *      destination is looked up against those APIs at most once globally,
 *      not on every render or every browser session. API keys live only in
 *      that edge function's environment, never in client-shipped code.
 *   3. Bundled local fallback — a generic travel photo shipped with the
 *      app, used when neither live source has anything for a destination
 *      the demo set doesn't cover. Guarantees *something* photographic
 *      renders rather than nothing, without depending on any network call.
 *
 * The curated map is a deliberate, narrow exception to the rest of
 * src/destinations/ being destination-agnostic (see registry.ts's own doc
 * comment) — it exists only to guarantee reliable, offline-safe imagery for
 * three specific demo destinations, and touches nothing else in that system.
 */

import { supabase } from '../lib/supabase';

export type DestinationPhotoSource = 'curated' | 'pexels' | 'pixabay' | 'fallback';

export interface DestinationPhoto {
  url: string;
  /** Meaningful alt text — always destination-specific, never empty. */
  alt: string;
  source: DestinationPhotoSource;
  /** Only ever set for source: 'pexels' | 'pixabay' — the photo APIs' own attribution requirements (see the attribution chip in DestinationHero/TripCard). */
  photographer?: string | null;
  photographerUrl?: string | null;
}

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Fixed, hand-picked images for the hackathon demo destinations — guaranteed
 * to render instantly with no external dependency. Tokyo/Lisbon reuse this
 * app's existing bundled destination photos; Queenstown currently reuses the
 * generic-highlands asset as a placeholder (no dedicated Queenstown photo is
 * bundled yet) — swap `url` below for a real one before presenting.
 */
const CURATED_PHOTOS: Record<string, { url: string; alt: string }> = {
  tokyo: { url: '/image/destination-tokyo.jpg', alt: 'Tokyo at dusk, city lights against the skyline' },
  lisbon: { url: '/image/destination-lisbon.jpg', alt: "Lisbon's tiled hillside streets overlooking the Tagus" },
  // Placeholder — see doc comment above.
  queenstown: { url: '/image/destination-generic-highlands.jpg', alt: 'Mountain and lake scenery near Queenstown' },
};

/** Generic bundled photo used when no curated or live-API photo is available. */
const FALLBACK_PHOTO = { url: '/image/landing-hero.jpg', alt: 'Scenic travel photograph' };

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchCurated(normalized: string): DestinationPhoto | null {
  for (const [keyword, photo] of Object.entries(CURATED_PHOTOS)) {
    if (normalized.includes(keyword)) {
      return { ...photo, source: 'curated' };
    }
  }
  return null;
}

interface ResolvePhotoResponse {
  photo?: { url: string; source: 'pexels' | 'pixabay'; photographer: string | null; photographerUrl: string | null } | null;
  error?: string;
}

/** Calls the server-side Pexels/Pixabay resolver — never throws, resolves to null on any failure (no session, network error, timeout, non-OK response). */
async function fetchLivePhoto(destination: string): Promise<DestinationPhoto | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-destination-photo`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ destination }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (!response.ok) return null;
    const json = await response.json() as ResolvePhotoResponse;
    if (!json.photo) return null;

    return {
      url: json.photo.url,
      alt: `Photo of ${destination}`,
      source: json.photo.source,
      photographer: json.photo.photographer,
      photographerUrl: json.photo.photographerUrl,
    };
  } catch {
    return null;
  }
}

// Keyed by normalized destination — in-memory only, avoids duplicate
// concurrent/repeat network calls within a single browser tab's lifetime.
// Durable, cross-session, cross-user reuse is the edge function's job (see
// resolve-destination-photo), backed by the destination_worlds table.
const cache = new Map<string, Promise<DestinationPhoto | null>>();

/**
 * Resolves a photo for a destination: curated, then Pexels/Pixabay (cached
 * server-side), then the generic bundled fallback. Never throws or rejects,
 * and never blocks — every caller can render its gradient scene immediately
 * and cross-fade this in only once/if it resolves.
 */
export function getDestinationPhoto(query: string): Promise<DestinationPhoto | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return Promise.resolve(null);

  const cached = cache.get(normalized);
  if (cached) return cached;

  const curated = matchCurated(normalized);
  const pending = curated
    ? Promise.resolve(curated)
    : fetchLivePhoto(query.trim()).then((photo) => photo ?? { ...FALLBACK_PHOTO, source: 'fallback' as const });

  cache.set(normalized, pending);
  return pending;
}
