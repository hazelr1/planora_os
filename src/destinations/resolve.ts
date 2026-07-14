/**
 * The single public entry point every screen should use to go from a trip's
 * free-text destination to a full `DestinationProfile`. Deliberately
 * synchronous — it never blocks a render on a network call — so it's safe
 * to call directly from component bodies, not just inside an effect.
 *
 * Resolution order: try the hand-authored registry first (exact atmosphere,
 * chosen colors, a real motif); fall through to the Undiscovered Protocol
 * only when nothing matches. Every trip gets a complete profile either way —
 * there is no "no theme" case in this engine, only "whose theme."
 */

import { matchRegisteredProfile } from './match';
import { inferMetadataFromFreeText } from './inference';
import { synthesizeDestinationProfile } from './undiscoveredProtocol';
import type { ResolvedDestinationExperience } from './types';

export function resolveDestinationExperience(destinationText: string): ResolvedDestinationExperience {
  const trimmed = (destinationText ?? '').trim();

  const match = matchRegisteredProfile(trimmed);
  if (match) {
    return { profile: match.profile, origin: 'handcrafted', matchedOn: match.matchedOn };
  }

  const metadata = inferMetadataFromFreeText(trimmed);
  const profile = synthesizeDestinationProfile(trimmed || 'Undiscovered', metadata);
  return { profile, origin: 'undiscovered' };
}
