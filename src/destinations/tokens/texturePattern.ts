/**
 * Renders `textureStyle` as an actual, reusable CSS pattern — a tiled SVG
 * data URI, no external asset. Deliberately one restrained technique (a
 * fine diagonal hairline) rather than four visually distinct motifs: the
 * brief calls for texture to be *felt, not forced*, and four competing
 * pattern shapes risk reading as busy or twee at exactly the moment they're
 * supposed to be nearly invisible. Only the line spacing changes per kind —
 * tighter for "grain," looser for "topographic" — which is enough to give
 * each destination a distinct texture character without the pattern itself
 * ever drawing attention.
 *
 * Consumed by DestinationHero today; not tied to it — any future component
 * that wants a destination's texture can call this directly.
 */

import type { GlassIntensityToken, TextureStyleToken } from './types';

const SPACING: Record<Exclude<TextureStyleToken, 'none'>, number> = {
  'wave-lines': 34,
  topographic: 26,
  linen: 18,
  grain: 10,
};

// Intentionally lower than the glass-panel opacities in cssVariables.ts —
// texture is the most easily overdone destination signal, so it gets the
// smallest numbers in the whole token system.
const OPACITY: Record<GlassIntensityToken, number> = { subtle: 0.04, medium: 0.06, strong: 0.09 };

export function getTextureBackgroundImage(kind: TextureStyleToken): string | undefined {
  if (kind === 'none') return undefined;
  const spacing = SPACING[kind];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${spacing}' height='${spacing}'>`
    + `<path d='M0 ${spacing} L${spacing} 0' stroke='white' stroke-width='0.6' fill='none'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export function getTextureOpacity(intensity: GlassIntensityToken): number {
  return OPACITY[intensity];
}
