const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function cacheKey(query: string) {
  return `geocode_cache:${btoa(query)}`;
}

function readCache(query: string) {
  try {
    const raw = localStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(query));
      return null;
    }
    return parsed.value as { lat: number; lon: number; display_name: string }[];
  } catch (e) {
    return null;
  }
}

function writeCache(query: string, value: any) {
  try {
    localStorage.setItem(cacheKey(query), JSON.stringify({ ts: Date.now(), value }));
  } catch (e) {
    // ignore storage failures
  }
}

export async function geocode(query: string) {
  const cached = readCache(query);
  if (cached) return cached;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    const json = await res.json();
    const mapped = json.map((r: any) => ({ lat: Number(r.lat), lon: Number(r.lon), display_name: r.display_name }));
    writeCache(query, mapped);
    return mapped;
  } catch (e) {
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json.display_name as string | null;
  } catch (e) {
    return null;
  }
}
