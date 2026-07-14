/**
 * The app's baseline, non-destination-themed atmosphere, expressed as
 * `ExperienceTokens`. Used whenever a trip's destination doesn't resolve to
 * an applied experience (see policy.ts) — every value here matches the
 * app's existing :root defaults (src/index.css) or its existing component
 * defaults (tailwind.config.js `boxShadow`, the `.card` glass opacities),
 * so projecting these tokens onto a scope reproduces today's un-themed look
 * exactly, rather than being a special "nothing" case components have to
 * branch around. That's the payoff of a token layer: "no destination
 * theme" is just another (very simple) set of token values, not a missing
 * one.
 */

import { getMotionPreset } from '../motionPresets';
import type { ExperienceTokens } from './types';

export const DEFAULT_EXPERIENCE_TOKENS: ExperienceTokens = {
  colors: {
    // Matches --brand-300..600 dark-mode defaults in src/index.css.
    accentSoft: '103 232 249',
    accent: '34 211 238',
    accentMid: '6 182 212',
    accentStrong: '8 145 178',
    secondary: '8 145 178',
    onAccent: '255 255 255',
    // Matches --accent-from/via/to dark-mode defaults in src/index.css.
    ctaFrom: '34 211 238',
    ctaVia: '59 130 246',
    ctaTo: '139 92 246',
  },
  gradients: {
    hero: 'linear-gradient(120deg, rgb(103 232 249) 0%, rgb(34 211 238) 45%, rgb(139 92 246) 100%)',
    ambient: 'linear-gradient(160deg, rgba(34,211,238,0.10) 0%, rgba(139,92,246,0.04) 100%)',
  },
  // Matches the app's existing shadow-card scale (tailwind.config.js) — moderate, not flat, not dramatic.
  elevation: 'soft',
  // Matches the .card / .card-interactive glass border opacities already in use (src/index.css).
  glassIntensity: 'medium',
  // Matches the app's default rounded-xl/rounded-2xl corners.
  borderStyle: 'soft',
  // Shares the app's existing fade-in/scale-in easing family (tailwind.config.js keyframes).
  motion: getMotionPreset('calm'),
  typographyEmphasis: 'balanced',
  illustrationDensity: 'minimal',
  spacingMood: 'balanced',
  iconTreatment: { motif: [], strokeWeight: 'regular', cornerStyle: 'soft' },
  decorativeDensity: 'minimal',
  textureStyle: 'none',
};
