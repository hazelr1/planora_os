/**
 * Public surface of the Destination Experience Engine.
 *
 * Two layers live here:
 *  - Authoring: `DestinationProfile`, the registry, the resolver, and the
 *    Undiscovered Protocol — where a destination's content comes from.
 *  - Consumption: `ExperienceTokens` (style) and `ExperienceCopy` (words) —
 *    the normalized shapes components actually read.
 *
 * Components should reach for `useExperienceTokens`, which returns both.
 * `resolveDestinationExperience` and the registry are exported too, for the
 * rarer case of needing profile-level content directly — but anything
 * about how a destination should look or what it should say belongs on the
 * tokens/copy side, not read off the profile.
 */

export type {
  RGBTriplet,
  DestinationIdentity,
  DestinationAtmosphere,
  DestinationAccentGradient,
  DestinationPalette,
  DestinationGradients,
  DestinationImagery,
  DestinationIllustrationStyle,
  MotifStroke,
  DestinationIconStyle,
  MotionPresetId,
  DestinationTexture,
  DestinationTravelInfo,
  DestinationAiTone,
  DestinationDecorativeAsset,
  DestinationProfile,
  DestinationMetadata,
  ClimateTag,
  ArchitectureTag,
  GeographyTag,
  CultureTag,
  DestinationOrigin,
  ResolvedDestinationExperience,
} from './types';

export { DESTINATION_REGISTRY } from './registry';
export { matchRegisteredProfile } from './match';
export { resolveDestinationExperience } from './resolve';
export { shouldApplyDestinationExperience } from './policy';
export { MOTION_PRESETS, getMotionPreset } from './motionPresets';
export type { MotionPresetDefinition } from './motionPresets';
export { inferMetadataFromFreeText, keywordInferenceStrategy } from './inference';
export type { MetadataInferenceStrategy } from './inference';
export { synthesizeDestinationProfile } from './undiscoveredProtocol';

export {
  sanitizeAiInsights, synthesizeAiDestinationProfile, requestAiDestinationWorld,
  normalizeDestinationKey, getCachedAiProfile, setCachedAiProfile,
} from './aiWorld';
export type { AiDestinationInsights } from './aiWorld';

export { deriveExperienceCopy, DEFAULT_EXPERIENCE_COPY } from './copy';
export type { ExperienceCopy } from './copy';

export { useExperienceTokens } from './useExperienceTokens';
export type { UseExperienceTokensResult, TokenOrigin } from './useExperienceTokens';

export type {
  ExperienceColorTokens,
  ExperienceGradientTokens,
  ElevationToken,
  GlassIntensityToken,
  BorderStyleToken,
  TypographyEmphasisToken,
  SpacingMoodToken,
  DensityToken,
  TextureStyleToken,
  ExperienceMotionTokens,
  ExperienceIconTreatmentTokens,
  ExperienceTokens,
} from './tokens';
export {
  deriveExperienceTokens, DEFAULT_EXPERIENCE_TOKENS, projectExperienceTokensToCss,
  getTextureBackgroundImage, getTextureOpacity,
} from './tokens';
