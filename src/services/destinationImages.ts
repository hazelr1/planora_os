/**
 * Real destination photography — a progressive enhancement layered on top
 * of the procedural gradient/motif system in src/destinations/. That system
 * remains the permanent fallback: this module only ever *adds* a photo on
 * top of it, and resolves to null (never throws) whenever a photo can't be
 * found, so every caller works unchanged with zero API keys configured.
 *
 * Destination-agnostic by design — no hardcoded place names here. Only
 * src/destinations/registry.ts is allowed to know specific destinations.
 *
 * Fetches a small batch of candidates per query rather than just one, and
 * picks today's from that batch via pickDaily — so a destination's photo
 * cycles day to day instead of freezing on whichever result came back
 * first, repeating through the same batch once every candidate's had a turn
 * if the search didn't return enough for true daily variety.
 */

import { pickDaily, todayKey } from '../lib/dailyRotation';

interface PexelsResponse {
  photos?: { src?: { large2x?: string } }[];
}

interface PixabayResponse {
  hits?: { largeImageURL?: string }[];
}

const FETCH_TIMEOUT_MS = 8_000;
const CANDIDATE_COUNT = 6;

// Keyed by normalized query + today's date — caches both hits and misses so
// a destination that resolved to nothing isn't re-queried against both APIs
// on every render, while still re-checking once a new day rolls the pick.
const cache = new Map<string, Promise<string | null>>();

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

async function fetchFromPexels(query: string): Promise<string[]> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${CANDIDATE_COUNT}`,
      { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const data = await res.json() as PexelsResponse;
    return (data.photos ?? []).map((p) => p.src?.large2x).filter((url): url is string => !!url);
  } catch {
    return [];
  }
}

async function fetchFromPixabay(query: string): Promise<string[]> {
  const apiKey = import.meta.env.VITE_PIXABAY_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${CANDIDATE_COUNT}`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return [];
    const data = await res.json() as PixabayResponse;
    return (data.hits ?? []).map((h) => h.largeImageURL).filter((url): url is string => !!url);
  } catch {
    return [];
  }
}

/**
 * Resolves today's photo URL for a destination query — Pexels first, then
 * Pixabay, then null. Never throws or rejects.
 */
export function getDestinationPhotoUrl(query: string): Promise<string | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return Promise.resolve(null);

  const cacheKey = `${normalized}::${todayKey()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pending = (async () => {
    const candidates = await fetchFromPexels(normalized);
    const pool = candidates.length > 0 ? candidates : await fetchFromPixabay(normalized);
    if (pool.length === 0) return null;
    return pickDaily(pool, normalized);
  })();

  cache.set(cacheKey, pending);
  return pending;
}
