/**
 * Experience Tokens — the consumption-layer schema.
 *
 * `DestinationProfile` (see ../types.ts) is the *authoring* layer: it's
 * where a destination's raw content lives — its exact colors, its motif
 * geometry, its AI voice. `ExperienceTokens` is the *consumption* layer:
 * a fixed, destination-agnostic shape that every component reads instead.
 *
 * Why the split matters in practice: a component that reads
 * `profile.palette.brand400` has coupled itself to the authoring schema —
 * if that schema gains a field, gets renamed, or a destination is generated
 * rather than hand-authored (different provenance, same shape), the
 * component doesn't care, because it was never looking at the profile.
 * It reads `tokens.colors.accent`, a name chosen for what the value *means
 * to a component* (the accent hue to render with), not for how it happened
 * to be authored (a Tailwind-scale number that only makes sense in the
 * context of tailwind.config.js). Every future screen built against this
 * schema keeps working even if the authoring side changes shape entirely.
 *
 * Some token categories carry concrete values a component can render
 * directly (colors, gradients, the motif recipe) — design systems
 * routinely call concrete values "tokens" too (Material's elevation
 * overlays, Tailwind's own color scale). Others are small closed
 * vocabularies describing *how much* of something to apply (density, mood,
 * emphasis) rather than a literal value — those are deliberately kept as
 * named enums, not raw numbers, so a component's logic reads as "if this
 * destination wants a *rich* illustration density" rather than an
 * unexplained magic-number comparison.
 */

import type { Transition } from 'framer-motion';
import type { DestinationIllustrationStyle, MotifStroke, RGBTriplet } from '../types';

export interface ExperienceColorTokens {
  /** The primary identifiable hue — icon color, active states, most accent UI. */
  accent: RGBTriplet;
  /** A stronger variant for hover/pressed/emphasis states. */
  accentStrong: RGBTriplet;
  /** A softer variant for tints and subtle backgrounds. */
  accentSoft: RGBTriplet;
  /** A middle stop, for anything needing a 4th point between accent and accentStrong (gradients, charts). */
  accentMid: RGBTriplet;
  /** A supporting hue distinct from the accent family — used sparingly. */
  secondary: RGBTriplet;
  /**
   * The color guaranteed legible drawn on top of the accent/CTA gradient.
   * Deliberately never destination-controlled — legibility on a CTA button
   * is an accessibility guarantee, not an atmosphere choice.
   */
  onAccent: RGBTriplet;
  /** The three stops of the CTA gradient (feeds .btn-primary's --accent-from/via/to — see src/index.css). */
  ctaFrom: RGBTriplet;
  ctaVia: RGBTriplet;
  ctaTo: RGBTriplet;
}

export interface ExperienceGradientTokens {
  /** Full CSS gradient for a compact hero banner. */
  hero: string;
  /** A subtler wash suitable for large ambient surfaces. */
  ambient: string;
}

export type ElevationToken = 'flat' | 'soft' | 'deep';
export type GlassIntensityToken = 'subtle' | 'medium' | 'strong';
export type BorderStyleToken = 'sharp' | 'soft';
export type TypographyEmphasisToken = 'quiet' | 'balanced' | 'expressive';
export type SpacingMoodToken = 'tight' | 'balanced' | 'generous';
/** Shared by illustrationDensity and decorativeDensity — same scale, independent derivations (see deriveExperienceTokens.ts). */
export type DensityToken = 'minimal' | 'light' | 'moderate' | 'rich';
/** Mirrors DestinationTexture['kind'] in ../types.ts — a named token so components never import the profile-level type directly. */
export type TextureStyleToken = 'none' | 'grain' | 'linen' | 'topographic' | 'wave-lines';

export interface ExperienceMotionTokens {
  transition: Transition;
  staggerChildren: number;
}

export interface ExperienceIconTreatmentTokens {
  /** The actual line-art recipe — see MotifStroke in ../types.ts. Content, not a style descriptor, but a component drawing an icon needs it, so it lives here rather than forcing a second lookup back into a profile. */
  motif: MotifStroke[];
  strokeWeight: 'thin' | 'regular' | 'bold';
  cornerStyle: 'sharp' | 'soft';
}

export interface ExperienceTokens {
  colors: ExperienceColorTokens;
  gradients: ExperienceGradientTokens;
  elevation: ElevationToken;
  glassIntensity: GlassIntensityToken;
  borderStyle: BorderStyleToken;
  motion: ExperienceMotionTokens;
  typographyEmphasis: TypographyEmphasisToken;
  illustrationDensity: DensityToken;
  spacingMood: SpacingMoodToken;
  iconTreatment: ExperienceIconTreatmentTokens;
  decorativeDensity: DensityToken;
  textureStyle: TextureStyleToken;
  /** Drives how DestinationMotif colors/weights its line art — see illustration.paletteBias in ../types.ts. Previously authored but never mapped through to this consumption layer. */
  illustrationPaletteBias: DestinationIllustrationStyle['paletteBias'];
}
