import { useMemo } from 'react';
import { resolveDestinationExperience } from './resolve';
import { shouldApplyDestinationExperience } from './policy';
import { deriveExperienceTokens } from './tokens/deriveExperienceTokens';
import { DEFAULT_EXPERIENCE_TOKENS } from './tokens/defaultTokens';
import { deriveExperienceCopy, DEFAULT_EXPERIENCE_COPY, type ExperienceCopy } from './copy';
import type { ExperienceTokens } from './tokens/types';

/** Distinct from `DestinationOrigin` — adds the 'default' case for when policy suppresses an otherwise-generated experience (see policy.ts). */
export type TokenOrigin = 'handcrafted' | 'generated' | 'default';

export interface UseExperienceTokensResult {
  tokens: ExperienceTokens;
  copy: ExperienceCopy;
  origin: TokenOrigin;
}

/**
 * The hook every component should use — the single call that replaces
 * reading `DestinationProfile` directly. It resolves the destination,
 * applies the theming policy (see policy.ts), and returns the full
 * consumption-layer bundle: normalized style tokens and normalized copy,
 * either derived from a real profile or the app's own defaults when
 * theming shouldn't apply. Both fall back together — a destination is
 * never partially themed (colors on, copy off, or vice versa).
 */
export function useExperienceTokens(destination: string): UseExperienceTokensResult {
  return useMemo(() => {
    const experience = resolveDestinationExperience(destination);
    const applyExperience = shouldApplyDestinationExperience(experience);
    return {
      tokens: applyExperience ? deriveExperienceTokens(experience.profile) : DEFAULT_EXPERIENCE_TOKENS,
      copy: applyExperience ? deriveExperienceCopy(experience.profile) : DEFAULT_EXPERIENCE_COPY,
      origin: applyExperience ? experience.origin : 'default',
    };
  }, [destination]);
}
