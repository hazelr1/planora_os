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
import type {
  ElevationToken, ExperienceTokens, GlassIntensityToken, BorderStyleToken, SpacingMoodToken, TypographyEmphasisToken,
} from './types';
import { getTextureBackgroundImage, getTextureOpacity } from './texturePattern';

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

// Subtle, restrained heading variation — never a dramatic weight/tracking
// swing, just enough that an "expressive" destination's headings feel a
// touch more confident and a "quiet" one a touch more composed.
const HEADING_TRACKING: Record<TypographyEmphasisToken, string> = {
  quiet: '-0.02em',
  balanced: '-0.015em',
  expressive: '-0.008em',
};
const HEADING_WEIGHT: Record<TypographyEmphasisToken, string> = {
  quiet: '600',
  balanced: '700',
  expressive: '700',
};

function easeToCss(transition: ExperienceTokens['motion']['transition']): string {
  const ease = 'ease' in transition ? transition.ease : undefined;
  if (Array.isArray(ease) && ease.length === 4) return `cubic-bezier(${ease.join(',')})`;
  return 'cubic-bezier(0.16, 1, 0.3, 1)'; // matches the app's own default entrance easing
}

function durationMs(transition: ExperienceTokens['motion']['transition'], fallback: number): number {
  const duration = 'duration' in transition ? transition.duration : undefined;
  return typeof duration === 'number' ? duration * 1000 : fallback;
}

export function projectExperienceTokensToCss(tokens: ExperienceTokens): CSSProperties {
  const entranceMs = durationMs(tokens.motion.transition, 500);
  const textureImage = getTextureBackgroundImage(tokens.textureStyle);

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
    '--dest-heading-tracking': HEADING_TRACKING[tokens.typographyEmphasis],
    '--dest-heading-weight': HEADING_WEIGHT[tokens.typographyEmphasis],
    '--dest-motion-duration': `${Math.round(entranceMs)}ms`,
    // Hover/press feedback should always read as snappier than a full entrance, never as slow as one.
    '--dest-hover-duration': `${Math.round(Math.min(420, Math.max(150, entranceMs * 0.55)))}ms`,
    '--dest-motion-ease': easeToCss(tokens.motion.transition),
    '--dest-stagger': `${Math.round(tokens.motion.staggerChildren * 1000)}ms`,
    ...(textureImage ? { '--dest-texture-image': textureImage } : {}),
    '--dest-texture-opacity': String(getTextureOpacity(tokens.glassIntensity)),
  } as CSSProperties;
}
