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
 * The AI Destination World Generator's server side.
 *
 * This function's only job is: given a free-text destination, return a
 * small structured bundle of metadata, enum choices, and short copy
 * strings describing that place — never CSS, never a component, never a
 * layout. The client (see src/destinations/aiWorld.ts) is the only thing
 * that ever turns these insights into a rendered `DestinationProfile`, and
 * it does so with exactly the same color-math/motif-table/gradient-template
 * primitives the deterministic Undiscovered Protocol already uses. That
 * split is what makes the "AI never generates CSS/components/layouts" rule
 * structural rather than a prompting convention: this function has no code
 * path that could even accept a CSS string from the model, because the
 * schema below has no field shaped like one.
 */

// ─── Cache key ────────────────────────────────────────────────────────────────

/** Mirrors src/destinations/aiWorld.ts's normalizeDestinationKey exactly — kept in sync by hand since edge functions don't share a build with the frontend. Intentionally simple (case/whitespace only) so distinct places that share a short name (e.g. "Paris, France" vs "Paris, Texas") are never conflated. */
function normalizeDestinationKey(destination: string): string {
  return destination.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── OpenAI structured output schema ─────────────────────────────────────────

const CLIMATE = ["tropical", "mediterranean", "alpine", "desert", "temperate", "arctic"];
const ARCHITECTURE = ["whitewashed", "domed", "timber", "high-rise", "historic", "modernist", "coastal-vernacular"];
const GEOGRAPHY = ["coastal", "island", "mountain", "desert", "forest", "urban", "volcanic", "lake", "savanna"];
const CULTURE = ["minimalist", "festive", "artisanal", "opulent", "spiritual", "rustic", "cosmopolitan"];
const MOTION = ["calm", "crisp", "vivid", "opulent", "organic"];
const TEXTURE = ["none", "grain", "linen", "topographic", "wave-lines"];
const STROKE_WEIGHT = ["thin", "regular", "bold"];
const CORNER_STYLE = ["sharp", "soft"];
const PALETTE_BIAS = ["monochrome", "duotone", "muted", "saturated"];

const responseSchema = {
  type: "object",
  properties: {
    destination_name: { type: "string" },
    region: { type: "string" },
    climate: { type: "string", enum: CLIMATE },
    architecture: { type: "array", items: { type: "string", enum: ARCHITECTURE } },
    geography: { type: "array", items: { type: "string", enum: GEOGRAPHY } },
    culture: { type: "array", items: { type: "string", enum: CULTURE } },
    mood_tags: { type: "array", items: { type: "string" } },
    essence: { type: "string" },
    quote: { type: "string" },
    primary_color_rgb: { type: "string" },
    deep_color_rgb: { type: "string" },
    secondary_color_rgb: { type: "string" },
    motion_preset: { type: "string", enum: MOTION },
    texture_kind: { type: "string", enum: TEXTURE },
    texture_intensity: { type: "number" },
    icon_stroke_weight: { type: "string", enum: STROKE_WEIGHT },
    icon_corner_style: { type: "string", enum: CORNER_STYLE },
    illustration_palette_bias: { type: "string", enum: PALETTE_BIAS },
    photography_style: { type: "string" },
    ai_voice_tags: { type: "array", items: { type: "string" } },
    ai_formality: { type: "number" },
    ai_exuberance: { type: "number" },
    ai_sample_opener: { type: "string" },
    best_season: { type: "string" },
    weather_hint: { type: "string" },
    loading_message: { type: "string" },
    empty_state_message: { type: "string" },
    decorative_asset_labels: { type: "array", items: { type: "string" } },
  },
  required: [
    "destination_name", "region", "climate", "architecture", "geography", "culture", "mood_tags",
    "essence", "quote", "primary_color_rgb", "deep_color_rgb", "secondary_color_rgb",
    "motion_preset", "texture_kind", "texture_intensity", "icon_stroke_weight", "icon_corner_style",
    "illustration_palette_bias", "photography_style", "ai_voice_tags", "ai_formality", "ai_exuberance",
    "ai_sample_opener", "best_season", "weather_hint", "loading_message", "empty_state_message",
    "decorative_asset_labels",
  ],
  additionalProperties: false,
};

interface RawInsights {
  destination_name: string;
  region: string;
  climate: string;
  architecture: string[];
  geography: string[];
  culture: string[];
  mood_tags: string[];
  essence: string;
  quote: string;
  primary_color_rgb: string;
  deep_color_rgb: string;
  secondary_color_rgb: string;
  motion_preset: string;
  texture_kind: string;
  texture_intensity: number;
  icon_stroke_weight: string;
  icon_corner_style: string;
  illustration_palette_bias: string;
  photography_style: string;
  ai_voice_tags: string[];
  ai_formality: number;
  ai_exuberance: number;
  ai_sample_opener: string;
  best_season: string;
  weather_hint: string;
  loading_message: string;
  empty_state_message: string;
  decorative_asset_labels: string[];
}

async function callOpenAI(destination: string, apiKey: string): Promise<RawInsights> {
  const systemPrompt = `You are Planora's Destination World analyst. Given a real-world travel destination — a city, island, region, or national park — analyze its country, region, climate, architecture, landscape, culture, history, typical colors, local materials, travel mood, photography style, iconography cues, and seasonal atmosphere, drawing on your own knowledge of the place.

You then output ONLY structured metadata describing how Planora's existing design system should feel for this destination: a color palette (as raw RGB values, never CSS), a small set of closed-vocabulary tags (climate/architecture/geography/culture/motion/texture/icon treatment), and a handful of short, evocative copy strings (an atmosphere brief, a pull-quote, an AI concierge greeting, a loading line, an empty-state line). You never produce CSS, HTML, SVG path data, component code, or layout instructions — Planora's own rendering system owns all of that; your job ends at description and choice.

Write like a discerning travel editor, not a brochure: be specific to this exact place rather than generic, and avoid clichés or stereotypes (no "hidden gem," no reducing a whole culture to one postcard image). Keep every string short — this is atmosphere, not an essay. Colors must be realistic photographic tones actually associated with the place (e.g. real stone, water, foliage, or material colors), formatted as "R G B" with each value 0-255. texture_intensity must stay low, between 0.05 and 0.2 — texture here is meant to be felt, not seen. If you are genuinely uncertain about a specific fact, choose the most plausible, dignified option rather than inventing a false specific.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Title": "Planora",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Destination: ${destination}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "destination_world", strict: true, schema: responseSchema },
      },
      temperature: 0.8,
      max_tokens: 1500,
    }),
  });

  if (response.status === 429) throw new Error("RATE_LIMITED");
  if (response.status === 401) throw new Error("INVALID_API_KEY");
  if (response.status === 402) throw new Error("INSUFFICIENT_CREDITS");
  if (!response.ok) throw new Error(`OPENROUTER_ERROR:${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("EMPTY_RESPONSE");

  try {
    return JSON.parse(content) as RawInsights;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

// ─── Server-side validation/clamping ──────────────────────────────────────────
//
// Defense in depth: the strict json_schema keeps the model inside the right
// shape and enum vocabulary, but says nothing about numeric ranges, string
// length, or degenerate values (empty strings, out-of-range numbers). This
// is the one place a malformed or low-quality response gets sanitized
// before it's ever cached or handed to a client — nothing downstream needs
// to re-check it, though the client does anyway (see aiWorld.ts) rather
// than trust a network response unconditionally.

function isRgbTriplet(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parts = value.trim().split(/\s+/);
  return parts.length === 3 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function clampArray(value: unknown, allowed: string[], max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && allowed.includes(v)).slice(0, max);
}

function clampStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, max);
}

function clampString(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/** The validated shape returned to the client — camelCase, matching AiDestinationInsights in src/destinations/aiWorld.ts. */
function sanitizeInsights(raw: RawInsights, destination: string): Record<string, unknown> | null {
  const destinationName = clampString(raw?.destination_name, 80, "");
  if (!destinationName) return null;

  return {
    destinationName,
    region: clampString(raw.region, 80, ""),
    climate: CLIMATE.includes(raw.climate) ? raw.climate : "temperate",
    architecture: clampArray(raw.architecture, ARCHITECTURE, 2),
    geography: clampArray(raw.geography, GEOGRAPHY, 2),
    culture: clampArray(raw.culture, CULTURE, 2),
    moodTags: clampStrings(raw.mood_tags, 6),
    essence: clampString(raw.essence, 220, `${destinationName}: an atmosphere shaped by its own place in the world.`),
    quote: clampString(raw.quote, 140, `${destinationName} is best understood by going.`),
    primaryColor: isRgbTriplet(raw.primary_color_rgb) ? raw.primary_color_rgb : "20 184 166",
    deepColor: isRgbTriplet(raw.deep_color_rgb) ? raw.deep_color_rgb : "15 118 110",
    secondaryColor: isRgbTriplet(raw.secondary_color_rgb) ? raw.secondary_color_rgb : "148 163 184",
    motionPreset: MOTION.includes(raw.motion_preset) ? raw.motion_preset : "calm",
    textureKind: TEXTURE.includes(raw.texture_kind) ? raw.texture_kind : "none",
    textureIntensity: Math.min(0.22, clamp01(raw.texture_intensity, 0.1)),
    iconStrokeWeight: STROKE_WEIGHT.includes(raw.icon_stroke_weight) ? raw.icon_stroke_weight : "regular",
    iconCornerStyle: CORNER_STYLE.includes(raw.icon_corner_style) ? raw.icon_corner_style : "soft",
    illustrationPaletteBias: PALETTE_BIAS.includes(raw.illustration_palette_bias) ? raw.illustration_palette_bias : "muted",
    photographyStyle: clampString(raw.photography_style, 140, `natural light, drawn from ${destinationName}'s own setting`),
    aiVoiceTags: clampStrings(raw.ai_voice_tags, 4).length ? clampStrings(raw.ai_voice_tags, 4) : ["warm", "curious"],
    aiFormality: clamp01(raw.ai_formality, 0.5),
    aiExuberance: clamp01(raw.ai_exuberance, 0.45),
    aiSampleOpener: clampString(raw.ai_sample_opener, 200, `Let's shape a trip to ${destinationName} — I'll follow your lead as we learn its rhythm.`),
    bestSeason: clampString(raw.best_season, 80, "Shoulder season, when it applies locally"),
    weatherHint: clampString(raw.weather_hint, 100, "Check a live forecast closer to your trip"),
    loadingMessage: clampString(raw.loading_message, 90, `Shaping your ${destinationName} itinerary…`),
    emptyStateMessage: clampString(raw.empty_state_message, 120, `Nothing planned here yet — give this day some of ${destinationName}'s own rhythm.`),
    decorativeAssetLabels: clampStrings(raw.decorative_asset_labels, 3),
    _sourceDestination: destination,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

    // Cache table is global/shared — no per-user ownership, so a service-role
    // client is appropriate (see the migration's comment for why).
    const svcClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const destinationKey = normalizeDestinationKey(destination);

    const { data: cached } = await svcClient
      .from("destination_worlds")
      .select("profile")
      .eq("destination_key", destinationKey)
      .maybeSingle();

    if (cached?.profile) {
      return jsonResponse({ insights: cached.profile, cached: true });
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      console.error("[generate-destination-world] OPENROUTER_API_KEY is not set");
      return jsonResponse({ error: "Destination world generation is currently unavailable." }, 503);
    }

    let raw: RawInsights;
    try {
      raw = await callOpenAI(destination, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "UNKNOWN";
      console.error("[generate-destination-world] OpenRouter error:", msg);
      if (msg === "RATE_LIMITED") return jsonResponse({ error: "Too many requests. Please try again in a moment." }, 429);
      if (msg === "INVALID_API_KEY") return jsonResponse({ error: "Generation service is misconfigured." }, 503);
      if (msg === "INSUFFICIENT_CREDITS") return jsonResponse({ error: "Generation service is out of credits." }, 503);
      return jsonResponse({ error: "Could not generate a destination world. Please try again." }, 502);
    }

    const insights = sanitizeInsights(raw, destination);
    if (!insights) return jsonResponse({ error: "Could not make sense of the generated destination world." }, 502);

    // Best-effort cache write. Upsert rather than plain insert: a row for
    // this destination_key may already exist with only its photo columns
    // populated (see resolve-destination-photo / 20260716140000), in which
    // case this needs to fill in display_name/profile on that same row
    // rather than conflict and silently no-op, leaving profile NULL forever.
    const { error: upsertErr } = await svcClient
      .from("destination_worlds")
      .upsert(
        { destination_key: destinationKey, display_name: insights.destinationName as string, profile: insights },
        { onConflict: "destination_key" },
      )
      .select("id")
      .maybeSingle();
    if (upsertErr) {
      console.error("[generate-destination-world] cache upsert failed:", upsertErr.message);
    }

    return jsonResponse({ insights, cached: false });
  } catch (err) {
    console.error("[generate-destination-world] Unhandled error:", err);
    return jsonResponse({ error: "An unexpected error occurred." }, 500);
  }
});
