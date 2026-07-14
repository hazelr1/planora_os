import type { ResolvedDestinationExperience } from './types';

/**
 * Single source of truth for whether a resolved experience should currently
 * be applied to the live UI.
 *
 * The Undiscovered Protocol (see undiscoveredProtocol.ts) is fully
 * implemented and produces real, usable profiles today — but switching
 * every unmatched destination over to a generated theme is a visual change
 * across most existing trips (anything outside the six hand-authored
 * destinations), and deciding how that should look is a design decision,
 * not an architecture one. This flag keeps that decision explicit and in
 * one place rather than duplicated across every consumer.
 *
 * Flipping this to `true` is the entire cutover — no component changes
 * required, because every consumer already calls
 * `shouldApplyDestinationExperience` instead of checking `origin` itself.
 */
export const APPLY_GENERATED_THEMES = false;

export function shouldApplyDestinationExperience(experience: ResolvedDestinationExperience): boolean {
  return experience.origin === 'handcrafted' || APPLY_GENERATED_THEMES;
}
