/**
 * Destination Experience Engine — core type contracts.
 *
 * A `DestinationProfile` is the single unit of authorship. Every field a
 * screen could ever want in order to adapt its atmosphere to a place lives
 * in one plain object — colors, gradients, imagery direction, motif
 * geometry, motion character, texture, AI voice, decorative content. A
 * component that wants to react to "where this trip is" never branches on
 * *which* destination it is; it only ever reads fields off whatever profile
 * it was handed. That single rule is what keeps individual destinations out
 * of component code — see `DestinationMotif.tsx`, which used to be a
 * switch-per-destination and is now a generic interpreter of
 * `iconStyle.motif`.
 *
 * `RGBTriplet` intentionally reuses the app's existing convention (a
 * space-separated "R G B" string, consumed as `rgb(var(--x) / <alpha>)`)
 * rather than inventing a new color format — see src/index.css. Destination
 * profiles plug directly into the CSS-variable theming system that already
 * exists; they don't require a second one.
 */

export type RGBTriplet = string;

export interface DestinationIdentity {
  /** Stable slug, e.g. 'santorini'. Used as data-destination-theme and as a registry key. */
  id: string;
  /** Display name, e.g. 'Santorini'. */
  name: string;
  /** Optional broader region/country label, for future copy or metadata display. */
  region?: string;
  /**
   * Lowercase keywords/phrases matched as substrings against a trip's free-text
   * destination string. Colocated on the profile itself (rather than a separate
   * lookup table) so that authoring a new destination is a single addition to
   * the registry array, not edits scattered across a color map, a keyword map,
   * and a motif switch — that fragmentation is what the old
   * destinationThemes.ts + DestinationMotif.tsx pairing suffered from.
   */
  aliases: string[];
}

export interface DestinationAtmosphere {
  /** Short descriptive tags, e.g. ['bright', 'mediterranean', 'luxurious', 'airy']. */
  mood: string[];
  /** One-sentence atmosphere brief. Seeds AI tone and any future copy generation. */
  essence: string;
  /** An evocative editorial pull-quote — distinct from `essence`: essence is descriptive, quote is emotional. Shown large/italic in a destination hero. */
  quote: string;
}

/**
 * Static, illustrative guidance — not a live weather/season feed. Every
 * consumer (see DestinationHero.tsx) must present these as general
 * guidance, never implying real-time data the app doesn't actually have.
 */
export interface DestinationTravelInfo {
  bestSeason: string;
  weatherHint: string;
}

export interface DestinationAccentGradient {
  from: RGBTriplet;
  via: RGBTriplet;
  to: RGBTriplet;
}

export interface DestinationPalette {
  /**
   * Named to match the app's existing --brand-300..600 scale exactly (see
   * tailwind.config.js `scale('brand')`), so a profile's palette can be
   * projected straight onto the CSS variables real components already read
   * — no translation layer, no second color scale to keep in sync.
   */
  brand300: RGBTriplet;
  brand400: RGBTriplet;
  brand500: RGBTriplet;
  brand600: RGBTriplet;
  /**
   * A supporting hue, distinct from the brand scale, used sparingly (e.g. a
   * secondary badge, a chart series). Not consumed by any component today —
   * forward-declared because "secondary colors" is a first-class part of the
   * brief, and every future screen should find it already in the profile
   * rather than each inventing its own ad hoc second color.
   */
  secondary: RGBTriplet;
  /** Three-stop gradient used by .btn-primary and similar CTAs within a themed scope. */
  accent: DestinationAccentGradient;
}

export interface DestinationGradients {
  /** Full CSS gradient string for the compact hero banner. */
  hero: string;
  /** Optional, subtler wash for larger ambient surfaces (page backgrounds, cards). */
  ambient?: string;
}

export interface DestinationImagery {
  /** Descriptive brief for photographic direction, e.g. 'golden hour, high contrast, whitewashed architecture'. */
  photographyStyle: string;
  /**
   * Real photo/illustration asset, when one exists. Intentionally optional —
   * the audit confirmed there are zero image assets anywhere in the repo
   * today, and the engine has to be fully usable without one. Every
   * consumer must treat this as possibly undefined, never assume it exists.
   */
  heroImageUrl?: string;
}

export interface DestinationIllustrationStyle {
  /** A brief describing the overall illustration/art direction, e.g. 'single-stroke line art, no fill, restrained'. */
  treatment: string;
  paletteBias: 'monochrome' | 'duotone' | 'muted' | 'saturated';
}

/**
 * A minimal vector primitive. `DestinationMotif.tsx` interprets an array of
 * these generically — every hand-authored motif that used to live in a
 * switch statement (Santorini's dome, Japan's torii gate, etc.) is now
 * expressed as a short list of these, and the exact same interpreter also
 * renders whatever the Undiscovered Protocol synthesizes for an unfamiliar
 * destination. One renderer, data-driven, no per-destination branch.
 */
export type MotifStroke =
  | { kind: 'path'; d: string; opacity?: number; strokeWidth?: number; fill?: 'none' | 'currentColor' }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; opacity?: number; strokeWidth?: number }
  | { kind: 'dot'; cx: number; cy: number; r: number; opacity?: number; filled?: boolean };

export interface DestinationIconStyle {
  /** The line-art recipe rendered by DestinationMotif — a handful of strokes, never more. */
  motif: MotifStroke[];
  strokeWeight: 'thin' | 'regular' | 'bold';
  cornerStyle: 'sharp' | 'soft';
}

/**
 * A small, closed set of reusable motion characters rather than bespoke
 * per-destination animation code. Components ask for "the transition for
 * this destination's motion preset," not "the transition for Santorini" —
 * see motionPresets.ts. Multiple destinations sharing a preset is expected
 * and fine; that's what makes it a system instead of one-off tuning.
 */
export type MotionPresetId = 'calm' | 'crisp' | 'vivid' | 'opulent' | 'organic';

export interface DestinationTexture {
  kind: 'none' | 'grain' | 'linen' | 'topographic' | 'wave-lines';
  /** 0..1. Kept low by design across every hand-authored profile — texture is meant to be felt, not seen. */
  intensity: number;
}

export interface DestinationAiTone {
  /** Tone tags for prompt-steering, e.g. ['warm', 'concise', 'a little poetic']. */
  voice: string[];
  /** 0..1 — how formal the AI copilot's language should read for this destination. */
  formality: number;
  /** 0..1 — how much energy/exclamation the language should carry. */
  exuberance: number;
  /** An example greeting line in-voice. Used as a prompt exemplar, not necessarily shown verbatim in the UI. */
  sampleOpener: string;
}

export interface DestinationDecorativeAsset {
  /** Human-readable name of a decorative element associated with this destination, e.g. 'Blue-domed rooftop'. */
  label: string;
  kind: 'motif' | 'texture-detail' | 'symbol';
}

export interface DestinationProfile {
  identity: DestinationIdentity;
  atmosphere: DestinationAtmosphere;
  palette: DestinationPalette;
  gradients: DestinationGradients;
  imagery: DestinationImagery;
  illustration: DestinationIllustrationStyle;
  iconStyle: DestinationIconStyle;
  motion: MotionPresetId;
  texture: DestinationTexture;
  aiTone: DestinationAiTone;
  decorativeAssets: DestinationDecorativeAsset[];
  travelInfo: DestinationTravelInfo;
}

/**
 * Structured signal about a destination that hasn't been hand-authored yet.
 * Every field is optional because the only thing guaranteed to exist is the
 * trip's free-text destination string — see undiscoveredProtocol.ts for how
 * this gets filled in from that string alone, and inference.ts for the seam
 * that lets a future, richer source (e.g. an LLM call) supply better values
 * for the same fields without changing anything downstream.
 */
export interface DestinationMetadata {
  country?: string;
  climate?: ClimateTag;
  architecture?: ArchitectureTag[];
  geography?: GeographyTag[];
  culture?: CultureTag[];
  photographyStyle?: string;
  colorPalette?: RGBTriplet[];
  travelMood?: string[];
}

export type ClimateTag =
  | 'tropical' | 'mediterranean' | 'alpine' | 'desert' | 'temperate' | 'arctic';

export type ArchitectureTag =
  | 'whitewashed' | 'domed' | 'timber' | 'high-rise' | 'historic' | 'modernist' | 'coastal-vernacular';

export type GeographyTag =
  | 'coastal' | 'island' | 'mountain' | 'desert' | 'forest' | 'urban' | 'volcanic' | 'lake' | 'savanna';

export type CultureTag =
  | 'minimalist' | 'festive' | 'artisanal' | 'opulent' | 'spiritual' | 'rustic' | 'cosmopolitan';

export type DestinationOrigin = 'handcrafted' | 'generated';

export interface ResolvedDestinationExperience {
  profile: DestinationProfile;
  /** 'handcrafted' when matched against the registry, 'generated' when synthesized by the Undiscovered Protocol. */
  origin: DestinationOrigin;
  /** Which alias/keyword triggered a handcrafted match — useful for debugging and for prioritizing what to hand-author next. */
  matchedOn?: string;
}
