/**
 * The AI Destination World Generator.
 *
 * This is the "any destination on Earth" seam of the Destination Experience
 * Engine. It never renders anything and never emits CSS, JSX, or layout —
 * it only ever produces `AiDestinationInsights`, a small structured bundle
 * of metadata, enum choices, and short copy strings, which
 * `synthesizeAiDestinationProfile` then composes into an ordinary
 * `DestinationProfile` using exactly the same building blocks (color math,
 * the geography/architecture motif tables, the gradient template) that
 * `undiscoveredProtocol.ts` already uses for its deterministic fallback.
 * From that point on, an AI-generated profile is indistinguishable in shape
 * from a hand-authored or deterministically-synthesized one — the existing
 * `deriveExperienceTokens`/`deriveExperienceCopy` layer is the only thing
 * that ever turns a profile into something a component renders, regardless
 * of which of the three ways it came into being.
 *
 * Network calls here must never throw and never block a render: every
 * export either resolves to a usable value or to `null`, so a caller (see
 * useExperienceTokens.ts) can always fall straight back to the instant,
 * offline Undiscovered Protocol without a try/catch of its own.
 */

import { supabase } from '../lib/supabase';
import { buildDestinationGradients, lighten, mix } from './colorMath';
import { ARCHITECTURE_MOTIF, GEOGRAPHY_MOTIF } from './metadataTags';
import type {
  ArchitectureTag, ClimateTag, CultureTag, DestinationProfile, GeographyTag, MotifStroke, MotionPresetId, RGBTriplet,
  DestinationIllustrationStyle, DestinationIconStyle, DestinationTexture,
} from './types';

/** The exact shape the edge function returns after its own server-side validation. Re-validated here too — a network response is never trusted just because it parsed as JSON. */
export interface AiDestinationInsights {
  destinationName: string;
  region: string;
  climate: ClimateTag;
  architecture: ArchitectureTag[];
  geography: GeographyTag[];
  culture: CultureTag[];
  moodTags: string[];
  essence: string;
  quote: string;
  primaryColor: RGBTriplet;
  deepColor: RGBTriplet;
  secondaryColor: RGBTriplet;
  motionPreset: MotionPresetId;
  textureKind: DestinationTexture['kind'];
  textureIntensity: number;
  iconStrokeWeight: DestinationIconStyle['strokeWeight'];
  iconCornerStyle: DestinationIconStyle['cornerStyle'];
  illustrationPaletteBias: DestinationIllustrationStyle['paletteBias'];
  photographyStyle: string;
  aiVoiceTags: string[];
  aiFormality: number;
  aiExuberance: number;
  aiSampleOpener: string;
  bestSeason: string;
  weatherHint: string;
  loadingMessage: string;
  emptyStateMessage: string;
  decorativeAssetLabels: string[];
}

const CLIMATE_TAGS: ClimateTag[] = ['tropical', 'mediterranean', 'alpine', 'desert', 'temperate', 'arctic'];
const ARCHITECTURE_TAGS: ArchitectureTag[] = ['whitewashed', 'domed', 'timber', 'high-rise', 'historic', 'modernist', 'coastal-vernacular'];
const GEOGRAPHY_TAGS: GeographyTag[] = ['coastal', 'island', 'mountain', 'desert', 'forest', 'urban', 'volcanic', 'lake', 'savanna'];
const CULTURE_TAGS: CultureTag[] = ['minimalist', 'festive', 'artisanal', 'opulent', 'spiritual', 'rustic', 'cosmopolitan'];
const MOTION_PRESETS: MotionPresetId[] = ['calm', 'crisp', 'vivid', 'opulent', 'organic'];
const TEXTURE_KINDS: DestinationTexture['kind'][] = ['none', 'grain', 'linen', 'topographic', 'wave-lines'];
const STROKE_WEIGHTS: DestinationIconStyle['strokeWeight'][] = ['thin', 'regular', 'bold'];
const CORNER_STYLES: DestinationIconStyle['cornerStyle'][] = ['sharp', 'soft'];
const PALETTE_BIASES: DestinationIllustrationStyle['paletteBias'][] = ['monochrome', 'duotone', 'muted', 'saturated'];

function isRgbTriplet(value: unknown): value is RGBTriplet {
  if (typeof value !== 'string') return false;
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function clamp01(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function stringArray(value: unknown, maxItems: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, maxItems);
}

function shortString(value: unknown, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : fallback;
}

/**
 * Defensive client-side re-validation of an already server-validated
 * response. Every field either survives as a well-formed value from the
 * allowed vocabulary/range or falls back to something safe — nothing here
 * can ever produce a broken color, an unrecognized enum, or an out-of-range
 * number, regardless of what the network actually sent.
 */
export function sanitizeAiInsights(raw: unknown): AiDestinationInsights | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const climate = CLIMATE_TAGS.includes(r.climate as ClimateTag) ? (r.climate as ClimateTag) : 'temperate';
  const architecture = (Array.isArray(r.architecture) ? r.architecture : [])
    .filter((t): t is ArchitectureTag => ARCHITECTURE_TAGS.includes(t as ArchitectureTag)).slice(0, 2);
  const geography = (Array.isArray(r.geography) ? r.geography : [])
    .filter((t): t is GeographyTag => GEOGRAPHY_TAGS.includes(t as GeographyTag)).slice(0, 2);
  const culture = (Array.isArray(r.culture) ? r.culture : [])
    .filter((t): t is CultureTag => CULTURE_TAGS.includes(t as CultureTag)).slice(0, 2);

  const primaryColor = isRgbTriplet(r.primaryColor) ? r.primaryColor : '20 184 166';
  const deepColor = isRgbTriplet(r.deepColor) ? r.deepColor : '15 118 110';
  const secondaryColor = isRgbTriplet(r.secondaryColor) ? r.secondaryColor : '148 163 184';

  const destinationName = shortString(r.destinationName, 80, '');
  if (!destinationName) return null; // the one field with no safe fallback — without a name, there's nothing to synthesize

  return {
    destinationName,
    region: shortString(r.region, 80, ''),
    climate,
    architecture,
    geography,
    culture,
    moodTags: stringArray(r.moodTags, 6),
    essence: shortString(r.essence, 220, `${destinationName}: an atmosphere shaped by its own place in the world.`),
    quote: shortString(r.quote, 140, `${destinationName} is best understood by going.`),
    primaryColor,
    deepColor,
    secondaryColor,
    motionPreset: MOTION_PRESETS.includes(r.motionPreset as MotionPresetId) ? (r.motionPreset as MotionPresetId) : 'calm',
    textureKind: TEXTURE_KINDS.includes(r.textureKind as DestinationTexture['kind']) ? (r.textureKind as DestinationTexture['kind']) : 'none',
    textureIntensity: Math.min(0.22, Math.max(0, clamp01(r.textureIntensity, 0.1))),
    iconStrokeWeight: STROKE_WEIGHTS.includes(r.iconStrokeWeight as DestinationIconStyle['strokeWeight']) ? (r.iconStrokeWeight as DestinationIconStyle['strokeWeight']) : 'regular',
    iconCornerStyle: CORNER_STYLES.includes(r.iconCornerStyle as DestinationIconStyle['cornerStyle']) ? (r.iconCornerStyle as DestinationIconStyle['cornerStyle']) : 'soft',
    illustrationPaletteBias: PALETTE_BIASES.includes(r.illustrationPaletteBias as DestinationIllustrationStyle['paletteBias']) ? (r.illustrationPaletteBias as DestinationIllustrationStyle['paletteBias']) : 'muted',
    photographyStyle: shortString(r.photographyStyle, 140, `natural light, drawn from ${destinationName}'s own setting`),
    aiVoiceTags: stringArray(r.aiVoiceTags, 4).length ? stringArray(r.aiVoiceTags, 4) : ['warm', 'curious'],
    aiFormality: clamp01(r.aiFormality, 0.5),
    aiExuberance: clamp01(r.aiExuberance, 0.45),
    aiSampleOpener: shortString(r.aiSampleOpener, 200, `Let's shape a trip to ${destinationName} — I'll follow your lead as we learn its rhythm.`),
    bestSeason: shortString(r.bestSeason, 80, 'Shoulder season, when it applies locally'),
    weatherHint: shortString(r.weatherHint, 100, 'Check a live forecast closer to your trip'),
    loadingMessage: shortString(r.loadingMessage, 90, `Shaping your ${destinationName} itinerary…`),
    emptyStateMessage: shortString(r.emptyStateMessage, 120, `Nothing planned here yet — give this day some of ${destinationName}'s own rhythm.`),
    decorativeAssetLabels: stringArray(r.decorativeAssetLabels, 3),
  };
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'undiscovered';
}

function buildMotif(insights: AiDestinationInsights): MotifStroke[] {
  const strokes: MotifStroke[] = [];
  if (insights.geography[0]) strokes.push(GEOGRAPHY_MOTIF[insights.geography[0]]);
  const architectureAccent = insights.architecture.find((tag) => ARCHITECTURE_MOTIF[tag]);
  if (architectureAccent) strokes.push(ARCHITECTURE_MOTIF[architectureAccent]!);
  strokes.push({ kind: 'line', x1: 15, y1: 88, x2: 185, y2: 88, opacity: 0.25 });
  return strokes;
}

/**
 * Pure and synchronous — turns already-validated AI insights into a full
 * `DestinationProfile` using the same composition primitives as the
 * Undiscovered Protocol (color math, motif tables, the gradient template).
 * The AI never touches any of these directly; it only ever chose which
 * closed-vocabulary tags and short strings to feed in.
 */
export function synthesizeAiDestinationProfile(destinationText: string, insights: AiDestinationInsights): DestinationProfile {
  const brand400 = insights.primaryColor;
  const brand600 = insights.deepColor;
  const brand300 = lighten(brand400, 0.55);
  const brand500 = mix(brand400, brand600, 0.4);

  return {
    identity: {
      id: slugify(destinationText),
      name: insights.destinationName,
      region: insights.region || undefined,
      aliases: [destinationText.toLowerCase()],
    },
    atmosphere: {
      mood: insights.moodTags.length ? insights.moodTags : [insights.climate],
      essence: insights.essence,
      quote: insights.quote,
      loadingMessage: insights.loadingMessage,
      emptyStateMessage: insights.emptyStateMessage,
    },
    palette: {
      brand300,
      brand400,
      brand500,
      brand600,
      secondary: insights.secondaryColor,
      accent: { from: brand400, via: insights.secondaryColor, to: brand600 },
    },
    gradients: buildDestinationGradients(brand300, brand400, brand600),
    imagery: {
      photographyStyle: insights.photographyStyle,
    },
    illustration: {
      treatment: 'single-stroke line art, restrained, matched to the app’s house style',
      paletteBias: insights.illustrationPaletteBias,
    },
    iconStyle: {
      motif: buildMotif(insights),
      strokeWeight: insights.iconStrokeWeight,
      cornerStyle: insights.iconCornerStyle,
    },
    motion: insights.motionPreset,
    texture: { kind: insights.textureKind, intensity: insights.textureIntensity },
    aiTone: {
      voice: insights.aiVoiceTags,
      formality: insights.aiFormality,
      exuberance: insights.aiExuberance,
      sampleOpener: insights.aiSampleOpener,
    },
    decorativeAssets: insights.decorativeAssetLabels.map((label) => ({ label, kind: 'motif' as const })),
    travelInfo: { bestSeason: insights.bestSeason, weatherHint: insights.weatherHint },
  };
}

/** Normalizes a free-text destination into a stable cache key — same idea as the edge function's server-side key, kept intentionally simple (case/whitespace only) so "Paris, France" and "Paris, Texas" are never conflated. */
export function normalizeDestinationKey(destination: string): string {
  return destination.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** In-memory only — avoids duplicate network calls within a single browser tab's lifetime. Cross-session/cross-user reuse is the edge function's job (see generate-destination-world), backed by the destination_worlds table. */
const memoryCache = new Map<string, DestinationProfile>();

export function getCachedAiProfile(destination: string): DestinationProfile | undefined {
  return memoryCache.get(normalizeDestinationKey(destination));
}

export function setCachedAiProfile(destination: string, profile: DestinationProfile): void {
  memoryCache.set(normalizeDestinationKey(destination), profile);
}

/**
 * Requests an AI-generated world for a destination. Resolves to `null` —
 * never rejects — on any failure (no session, network error, timeout,
 * non-OK response, or a response that fails sanitization), so a caller can
 * always treat `null` as "stay on the Undiscovered Protocol fallback."
 */
export async function requestAiDestinationWorld(destination: string): Promise<AiDestinationInsights | null> {
  const trimmed = destination.trim();
  if (!trimmed) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-destination-world`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ destination: trimmed }),
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!response.ok) return null;
    const json = await response.json();
    if (!json || typeof json !== 'object' || 'error' in json) return null;

    return sanitizeAiInsights((json as { insights?: unknown }).insights);
  } catch {
    return null;
  }
}
