import type { ResolvedDestinationExperience } from './types';

/**
 * Single source of truth for whether a resolved experience should currently
 * be applied to the live UI.
 *
 * Every trip now gets its destination's atmosphere, regardless of origin:
 * a hand-authored benchmark, an AI-generated world, or the deterministic
 * Undiscovered Protocol fallback all produce a complete, intentional
 * `DestinationProfile` (see aiWorld.ts and undiscoveredProtocol.ts) — there
 * is no "lesser" tier to gate behind a flag anymore. This function stays as
 * the single seam every consumer calls (instead of checking `origin`
 * itself) in case a future, genuinely different policy need shows up —
 * e.g. a user-level "reduce destination theming" preference.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept as the stable seam signature; see doc comment above.
export function shouldApplyDestinationExperience(_experience: ResolvedDestinationExperience): boolean {
  return true;
}
