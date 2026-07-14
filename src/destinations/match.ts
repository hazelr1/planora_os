/**
 * Matches a trip's free-text destination string against the hand-authored
 * registry. Replaces the old, separate KEYWORD_MAP regex table — aliases now
 * live on each profile (see registry.ts), so there is one list to update
 * per destination instead of two.
 */

import { DESTINATION_REGISTRY } from './registry';
import type { DestinationProfile } from './types';

export interface RegistryMatch {
  profile: DestinationProfile;
  matchedOn: string;
}

export function matchRegisteredProfile(destinationText: string): RegistryMatch | null {
  const lower = destinationText.toLowerCase();
  for (const profile of DESTINATION_REGISTRY) {
    const hit = profile.identity.aliases.find((alias) => lower.includes(alias));
    if (hit) return { profile, matchedOn: hit };
  }
  return null;
}
