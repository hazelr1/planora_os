/**
 * Projects `ExperienceTokens` onto the app's CSS-custom-property theming
 * surface — the only place a token turns into an actual style value.
 *
 * `--brand-300..600` and `--accent-from/via/to` are load-bearing: existing
 * components already read them (Tailwind's `brand-*` classes, `.btn-primary`
 * — see tailwind.config.js and src/index.css). The `--dest-*` names are the
 * CSS-facing surface of the newer token categories (glass intensity,
 * elevation, border radius, spacing) — concrete values a future component
 * can use via `var(--dest-*)` without importing anything from this module.
 * Motion tokens are deliberately not projected here: a Framer Motion
 * `Transition` object has no CSS representation, so components that need it
 * read `tokens.motion` directly instead.
 */

import type { CSSProperties } from 'react';
import type { ElevationToken, ExperienceTokens, GlassIntensityToken, BorderStyleToken, SpacingMoodToken } from './types';

const ELEVATION_SHADOW: Record<ElevationToken, string> = {
  flat: 'none',
  // Mirrors tailwind.config.js boxShadow.card.
  soft: '0 4px 24px -4px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.06)',
  // Mirrors tailwind.config.js boxShadow.pop.
  deep: '0 20px 60px -12px rgba(0,0,0,0.55), 0 0 1px rgba(255,255,255,0.08)',
};

// Mirrors the .card / .card-interactive glass border opacities already in use (src/index.css).
const GLASS_OPACITY: Record<GlassIntensityToken, number> = { subtle: 0.08, medium: 0.14, strong: 0.2 };

const BORDER_RADIUS: Record<BorderStyleToken, string> = { sharp: '0.5rem', soft: '1.25rem' };

const SPACING_SCALE: Record<SpacingMoodToken, string> = { tight: '0.85', balanced: '1', generous: '1.2' };

export function projectExperienceTokensToCss(tokens: ExperienceTokens): CSSProperties {
  return {
    '--brand-300': tokens.colors.accentSoft,
    '--brand-400': tokens.colors.accent,
    '--brand-500': tokens.colors.accentMid,
    '--brand-600': tokens.colors.accentStrong,
    '--accent-from': tokens.colors.ctaFrom,
    '--accent-via': tokens.colors.ctaVia,
    '--accent-to': tokens.colors.ctaTo,
    '--dest-secondary': tokens.colors.secondary,
    '--dest-ambient': tokens.gradients.ambient,
    '--dest-elevation-shadow': ELEVATION_SHADOW[tokens.elevation],
    '--dest-glass-opacity': String(GLASS_OPACITY[tokens.glassIntensity]),
    '--dest-radius': BORDER_RADIUS[tokens.borderStyle],
    '--dest-spacing-scale': SPACING_SCALE[tokens.spacingMood],
  } as CSSProperties;
}
