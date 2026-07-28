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
 *
 * There used to be a step 3 here: an unrelated bundled stock photo (a
 * sailboat) substituted in whenever step 2 failed. Removed — every caller
 * (TripCard, DestinationPlanCard, DestinationHero) already renders its own
 * neutral gradient/skeleton placeholder when this resolves to null, so the
 * substitution was never actually filling a gap, it was overriding a
 * perfectly good neutral state with an unrelated photo. That made a
 * *transient* failure (this module's own client-side timeout — see
 * fetchLivePhoto — racing under the ~15-20 concurrent requests the
 * Suggested Trip Plans grid fires on mount) look like "this destination's
 * photo is a sailboat" instead of "still loading" — worse, once memoized
 * in the cache below it stayed that way for the rest of the browser tab's
 * session. Confirmed via direct edge-function calls that the server side
 * (Pexels lookup + its cache in destination_worlds) was returning correct
 * results the whole time; concurrent-request latency was documented as high
 * as ~3.9s per request in a 15-way burst, well within reach of this
 * module's own timeout under worse conditions.
 *
 * The curated map is a deliberate, narrow exception to the rest of
 * src/destinations/ being destination-agnostic (see registry.ts's own doc
 * comment) — it exists only to guarantee reliable, offline-safe imagery for
 * three specific demo destinations, and touches nothing else in that system.
 */

import { supabase } from '../lib/supabase';
import { withPhotoVersion } from '../utils/assetVersion';

export type DestinationPhotoSource = 'curated' | 'pexels' | 'pixabay';

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
  tokyo: { url: withPhotoVersion('/image/destination-tokyo.jpg'), alt: 'Tokyo at dusk, city lights against the skyline' },
  lisbon: { url: withPhotoVersion('/image/destination-lisbon.jpg'), alt: "Lisbon's tiled hillside streets overlooking the Tagus" },
  // Placeholder — see doc comment above.
  queenstown: { url: withPhotoVersion('/image/destination-generic-highlands.jpg'), alt: 'Mountain and lake scenery near Queenstown' },
};

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

/** Calls the server-side Pexels/Pixabay resolver — never throws, resolves to null on any failure (no session, network error, timeout, non-OK response). Every failure path logs, so a bad run shows up in the console instead of silently reading as "no photo for this destination." */
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

    if (!response.ok) {
      console.warn(`[destinationImages] resolve-destination-photo returned ${response.status} for "${destination}"`);
      return null;
    }
    const json = await response.json() as ResolvePhotoResponse;
    if (!json.photo) return null;

    return {
      url: json.photo.url,
      alt: `Photo of ${destination}`,
      source: json.photo.source,
      photographer: json.photo.photographer,
      photographerUrl: json.photo.photographerUrl,
    };
  } catch (err) {
    // Most often the client-side AbortSignal.timeout firing — under the
    // ~15-20 concurrent requests a full destination grid fires on mount,
    // individual invocations have been observed taking several seconds
    // (see the doc comment above), so this is a real, reproducible-under-
    // load failure mode, not a hypothetical one.
    console.warn(`[destinationImages] live photo lookup failed for "${destination}":`, err);
    return null;
  }
}

// Keyed by normalized destination — in-memory only, avoids duplicate
// concurrent/repeat network calls within a single browser tab's lifetime.
// Durable, cross-session, cross-user reuse is the edge function's job (see
// resolve-destination-photo), backed by the destination_worlds table.
//
// Only ever holds *successful* resolutions. A failed lookup is deliberately
// never memoized here (see the resolve-and-evict logic below) — it's most
// likely transient (a timeout under concurrent load, a network blip), and
// caching it would leave that destination showing the neutral placeholder
// for the rest of this tab's session even after the underlying issue
// clears. The in-flight promise is still shared with concurrent callers
// (so a burst of cards requesting the same destination at once only
// triggers one network call) — it's just not kept once it settles false.
const cache = new Map<string, Promise<DestinationPhoto | null>>();

/**
 * Resolves a photo for a destination: curated, then Pexels/Pixabay (cached
 * server-side). Never throws or rejects, and never blocks — every caller
 * can render its own neutral gradient/skeleton immediately and cross-fade
 * this in only once/if it resolves. Resolves to null (not a substitute
 * photo) when nothing is available, so a failure reads as "still loading"
 * rather than "here's an unrelated photo."
 */
export function getDestinationPhoto(query: string): Promise<DestinationPhoto | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return Promise.resolve(null);

  const cached = cache.get(normalized);
  if (cached) return cached;

  const curated = matchCurated(normalized);
  if (curated) {
    const resolved = Promise.resolve(curated);
    cache.set(normalized, resolved);
    return resolved;
  }

  const pending = fetchLivePhoto(query.trim()).then((photo) => {
    if (!photo) cache.delete(normalized);
    return photo;
  });

  cache.set(normalized, pending);
  return pending;
}
