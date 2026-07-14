/**
 * Real destination photography — a progressive enhancement layered on top
 * of the procedural gradient/motif system in src/destinations/. That system
 * remains the permanent fallback: this module only ever *adds* a photo on
 * top of it, and resolves to null (never throws) whenever a photo can't be
 * found, so every caller works unchanged with zero API keys configured.
 *
 * Destination-agnostic by design — no hardcoded place names here. Only
 * src/destinations/registry.ts is allowed to know specific destinations.
 */

interface PexelsResponse {
  photos?: { src?: { large2x?: string } }[];
}

interface PixabayResponse {
  hits?: { largeImageURL?: string }[];
}

const FETCH_TIMEOUT_MS = 8_000;

// Keyed by normalized query — caches both hits and misses so a destination
// that resolved to nothing isn't re-queried against both APIs on every
// render either.
const cache = new Map<string, Promise<string | null>>();

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

async function fetchFromPexels(query: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json() as PexelsResponse;
    return data.photos?.[0]?.src?.large2x ?? null;
  } catch {
    return null;
  }
}

async function fetchFromPixabay(query: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_PIXABAY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json() as PixabayResponse;
    return data.hits?.[0]?.largeImageURL ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves a real photo URL for a destination query — Pexels first, then
 * Pixabay, then null. Never throws or rejects.
 */
export function getDestinationPhotoUrl(query: string): Promise<string | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) return Promise.resolve(null);

  const cached = cache.get(normalized);
  if (cached) return cached;

  const pending = fetchFromPexels(normalized).then((url) => url ?? fetchFromPixabay(normalized));
  cache.set(normalized, pending);
  return pending;
}
