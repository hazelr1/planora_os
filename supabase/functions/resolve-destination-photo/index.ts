import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Resolves a real photo for a destination — Pexels first, then Pixabay —
 * and caches the result in destination_worlds so any given destination is
 * looked up against those APIs at most once (see the freshness rule below),
 * globally across every user, rather than on every render or every browser
 * session. Curated demo-destination images and the generic local fallback
 * are handled entirely client-side (see src/services/destinationImages.ts)
 * and never reach this function — it only ever deals with the two live
 * photo APIs and their cache.
 *
 * API keys are read server-side only (PEXELS_API_KEY / PIXABAY_API_KEY as
 * Supabase secrets) — never exposed to the client, unlike the VITE_-prefixed
 * variables this replaces, which were bundled into public JS.
 */

// ─── Cache key ────────────────────────────────────────────────────────────────

/** Mirrors src/services/destinationImages.ts's normalizeQuery exactly — kept in sync by hand since edge functions don't share a build with the frontend. */
function normalizeDestinationKey(destination: string): string {
  return destination.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Source fetchers ──────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 6_000;

interface ResolvedPhoto {
  url: string;
  source: "pexels" | "pixabay";
  photographer: string | null;
  photographerUrl: string | null;
}

interface PexelsPhoto {
  src?: { large2x?: string };
  photographer?: string;
  photographer_url?: string;
}
interface PexelsResponse {
  photos?: PexelsPhoto[];
}

async function fetchFromPexels(query: string, apiKey: string): Promise<ResolvedPhoto | null> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`,
      { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json() as PexelsResponse;
    const photo = data.photos?.[0];
    const url = photo?.src?.large2x;
    if (!url) return null;
    return {
      url,
      source: "pexels",
      photographer: photo?.photographer ?? null,
      photographerUrl: photo?.photographer_url ?? null,
    };
  } catch {
    return null;
  }
}

interface PixabayHit {
  largeImageURL?: string;
  user?: string;
  pageURL?: string;
}
interface PixabayResponse {
  hits?: PixabayHit[];
}

async function fetchFromPixabay(query: string, apiKey: string): Promise<ResolvedPhoto | null> {
  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`,
      { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
    );
    if (!res.ok) return null;
    const data = await res.json() as PixabayResponse;
    const hit = data.hits?.[0];
    const url = hit?.largeImageURL;
    if (!url) return null;
    return {
      url,
      source: "pixabay",
      photographer: hit?.user ?? null,
      photographerUrl: hit?.pageURL ?? null,
    };
  } catch {
    return null;
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

const PIXABAY_MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required." }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Authentication required." }, 401);

    let body: { destination?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const destination = body.destination?.trim();
    if (!destination) return jsonResponse({ error: "Destination is required." }, 400);
    if (destination.length > 200) return jsonResponse({ error: "Destination is too long." }, 400);

    // Cache table is global/shared — no per-user ownership (see the
    // destination_worlds migrations for why a service-role client is used).
    const svcClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const destinationKey = normalizeDestinationKey(destination);

    const { data: existing } = await svcClient
      .from("destination_worlds")
      .select("photo_url, photo_source, photo_photographer, photo_photographer_url, photo_resolved_at")
      .eq("destination_key", destinationKey)
      .maybeSingle();

    // Freshness: Pexels-sourced (and previously-tried-and-empty) results are
    // cached indefinitely. Pixabay's API terms disallow permanent hotlinking
    // of their CDN URLs, so a Pixabay-sourced row is only trusted for 24h —
    // past that it's treated as stale and re-resolved, same as if it had
    // never been cached.
    if (existing?.photo_resolved_at) {
      const isPixabayStale = existing.photo_source === "pixabay" &&
        Date.now() - new Date(existing.photo_resolved_at).getTime() > PIXABAY_MAX_CACHE_AGE_MS;
      if (!isPixabayStale) {
        return jsonResponse({
          photo: existing.photo_url
            ? {
              url: existing.photo_url,
              source: existing.photo_source,
              photographer: existing.photo_photographer,
              photographerUrl: existing.photo_photographer_url,
            }
            : null,
          cached: true,
        });
      }
    }

    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    const pixabayKey = Deno.env.get("PIXABAY_API_KEY");

    const resolved =
      (pexelsKey ? await fetchFromPexels(destination, pexelsKey) : null) ??
      (pixabayKey ? await fetchFromPixabay(destination, pixabayKey) : null);

    const photoFields = {
      photo_url: resolved?.url ?? null,
      photo_source: resolved?.source ?? null,
      photo_photographer: resolved?.photographer ?? null,
      photo_photographer_url: resolved?.photographerUrl ?? null,
      photo_resolved_at: new Date().toISOString(),
    };

    // Best-effort cache write — a failed write shouldn't fail the response;
    // the client already has a usable (if not durably cached) result.
    if (existing) {
      const { error: updateErr } = await svcClient
        .from("destination_worlds")
        .update(photoFields)
        .eq("destination_key", destinationKey);
      if (updateErr) console.error("[resolve-destination-photo] cache update failed:", updateErr.message);
    } else {
      const { error: insertErr } = await svcClient
        .from("destination_worlds")
        .insert({ destination_key: destinationKey, display_name: destination, ...photoFields })
        .select("id")
        .maybeSingle();
      if (insertErr && insertErr.code !== "23505") {
        console.error("[resolve-destination-photo] cache insert failed:", insertErr.message);
      }
    }

    return jsonResponse({
      photo: resolved
        ? { url: resolved.url, source: resolved.source, photographer: resolved.photographer, photographerUrl: resolved.photographerUrl }
        : null,
      cached: false,
    });
  } catch (err) {
    console.error("[resolve-destination-photo] Unhandled error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
