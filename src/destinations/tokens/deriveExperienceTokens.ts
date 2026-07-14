/**
 * The one function that turns an authored/generated `DestinationProfile`
 * into consumable `ExperienceTokens`. Nothing else in the codebase should
 * know how to make this translation — if a mapping rule below changes
 * (say, which texture intensities count as "strong" glass), every
 * component downstream picks it up automatically without being touched.
 *
 * Two kinds of mapping happen here:
 *  1. Renaming — `profile.palette.brand400` becomes `tokens.colors.accent`.
 *     No computation, just decoupling components from the authoring
 *     schema's naming.
 *  2. Normalization — categories the brief asked for (elevation, glass
 *     intensity, border style, typography emphasis, spacing mood,
 *     illustration/decorative density) don't have a direct 1:1 field on
 *     `DestinationProfile` today. Each is derived from whichever existing
 *     profile field already carries that signal, documented inline. These
 *     mappings are a first-cut, deliberately simple and tunable — the
 *     point is that there is exactly one place to tune them.
 */

import type { DestinationProfile } from '../types';
import { getMotionPreset } from '../motionPresets';
import type {
  DensityToken, ElevationToken, ExperienceTokens, GlassIntensityToken, SpacingMoodToken, TypographyEmphasisToken,
} from './types';

const MOTION_TO_ELEVATION: Record<DestinationProfile['motion'], ElevationToken> = {
  calm: 'soft',
  crisp: 'soft',
  vivid: 'soft',
  organic: 'soft',
  opulent: 'deep',
};

const MOTION_TO_SPACING_MOOD: Record<DestinationProfile['motion'], SpacingMoodToken> = {
  calm: 'generous',
  opulent: 'generous',
  crisp: 'balanced',
  organic: 'balanced',
  vivid: 'tight',
};

function deriveGlassIntensity(textureIntensity: number): GlassIntensityToken {
  if (textureIntensity < 0.13) return 'subtle';
  if (textureIntensity < 0.19) return 'medium';
  return 'strong';
}

function deriveTypographyEmphasis(exuberance: number): TypographyEmphasisToken {
  if (exuberance < 0.35) return 'quiet';
  if (exuberance < 0.6) return 'balanced';
  return 'expressive';
}

/** Motif recipes stay small by design (see registry.ts) — these thresholds match the 2-7 stroke range every hand-authored profile falls into. */
function deriveIllustrationDensity(motifStrokeCount: number): DensityToken {
  if (motifStrokeCount <= 2) return 'minimal';
  if (motifStrokeCount <= 4) return 'light';
  if (motifStrokeCount <= 6) return 'moderate';
  return 'rich';
}

/** Distinct signal from illustrationDensity — this measures named decorative content briefs, not motif line-art complexity. */
function deriveDecorativeDensity(decorativeAssetCount: number): DensityToken {
  if (decorativeAssetCount === 0) return 'minimal';
  if (decorativeAssetCount <= 2) return 'light';
  if (decorativeAssetCount === 3) return 'moderate';
  return 'rich';
}

export function deriveExperienceTokens(profile: DestinationProfile): ExperienceTokens {
  return {
    colors: {
      accentSoft: profile.palette.brand300,
      accent: profile.palette.brand400,
      accentMid: profile.palette.brand500,
      accentStrong: profile.palette.brand600,
      secondary: profile.palette.secondary,
      onAccent: '255 255 255',
      ctaFrom: profile.palette.accent.from,
      ctaVia: profile.palette.accent.via,
      ctaTo: profile.palette.accent.to,
    },
    gradients: {
      hero: profile.gradients.hero,
      ambient: profile.gradients.ambient ?? profile.gradients.hero,
    },
    elevation: MOTION_TO_ELEVATION[profile.motion],
    glassIntensity: deriveGlassIntensity(profile.texture.intensity),
    borderStyle: profile.iconStyle.cornerStyle,
    motion: getMotionPreset(profile.motion),
    typographyEmphasis: deriveTypographyEmphasis(profile.aiTone.exuberance),
    illustrationDensity: deriveIllustrationDensity(profile.iconStyle.motif.length),
    spacingMood: MOTION_TO_SPACING_MOOD[profile.motion],
    iconTreatment: {
      motif: profile.iconStyle.motif,
      strokeWeight: profile.iconStyle.strokeWeight,
      cornerStyle: profile.iconStyle.cornerStyle,
    },
    decorativeDensity: deriveDecorativeDensity(profile.decorativeAssets.length),
    textureStyle: profile.texture.kind,
    illustrationPaletteBias: profile.illustration.paletteBias,
  };
}
