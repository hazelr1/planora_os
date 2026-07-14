import { useEffect, useMemo, useState } from 'react';
import { resolveDestinationExperience } from './resolve';
import { shouldApplyDestinationExperience } from './policy';
import { getCachedAiProfile, requestAiDestinationWorld, setCachedAiProfile, synthesizeAiDestinationProfile } from './aiWorld';
import { deriveExperienceTokens } from './tokens/deriveExperienceTokens';
import { DEFAULT_EXPERIENCE_TOKENS } from './tokens/defaultTokens';
import { deriveExperienceCopy, DEFAULT_EXPERIENCE_COPY, type ExperienceCopy } from './copy';
import type { DestinationOrigin, ResolvedDestinationExperience } from './types';
import type { ExperienceTokens } from './tokens/types';

/** Distinct from `DestinationOrigin` — adds the 'default' case for when policy suppresses an otherwise-generated experience (see policy.ts). */
export type TokenOrigin = DestinationOrigin | 'default';

export interface UseExperienceTokensResult {
  tokens: ExperienceTokens;
  copy: ExperienceCopy;
  origin: TokenOrigin;
}

/**
 * The hook every component should use — the single call that replaces
 * reading `DestinationProfile` directly.
 *
 * Resolution happens in two phases so a trip's atmosphere is never blocked
 * on a network call: `resolveDestinationExperience` runs synchronously on
 * every render and instantly returns either a handcrafted match or the
 * deterministic Undiscovered Protocol profile — that's what paints first,
 * with no loading state of its own. If the destination isn't handcrafted,
 * an effect kicks off a background request to the AI Destination World
 * Generator (see aiWorld.ts); if it resolves before the component unmounts
 * or the destination changes again, the richer AI-generated profile quietly
 * replaces the instant one. If the request fails, is slow, or the
 * destination has no session to authenticate with, the instant fallback
 * simply keeps rendering — there is no error state a consumer needs to
 * handle.
 */
export function useExperienceTokens(destination: string): UseExperienceTokensResult {
  const instant = useMemo(() => resolveDestinationExperience(destination), [destination]);
  const [enhanced, setEnhanced] = useState<ResolvedDestinationExperience | null>(null);

  useEffect(() => {
    setEnhanced(null);
    if (instant.origin === 'handcrafted') return undefined;

    const cached = getCachedAiProfile(destination);
    if (cached) {
      setEnhanced({ profile: cached, origin: 'ai-generated' });
      return undefined;
    }

    let cancelled = false;
    void requestAiDestinationWorld(destination).then((insights) => {
      if (cancelled || !insights) return;
      const profile = synthesizeAiDestinationProfile(destination, insights);
      setCachedAiProfile(destination, profile);
      setEnhanced({ profile, origin: 'ai-generated' });
    });

    return () => { cancelled = true; };
  }, [destination, instant.origin]);

  const resolved = enhanced ?? instant;
  const applyExperience = shouldApplyDestinationExperience(resolved);

  return {
    tokens: applyExperience ? deriveExperienceTokens(resolved.profile) : DEFAULT_EXPERIENCE_TOKENS,
    copy: applyExperience ? deriveExperienceCopy(resolved.profile) : DEFAULT_EXPERIENCE_COPY,
    origin: applyExperience ? resolved.origin : 'default',
  };
}
