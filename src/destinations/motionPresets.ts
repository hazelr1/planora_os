/**
 * A small, closed set of motion characters. Every destination profile picks
 * one (`profile.motion`) instead of shipping its own bespoke Framer Motion
 * config — this is what keeps motion "a system" rather than N one-off
 * tunings that drift apart over time as more destinations get added.
 *
 * These are intentionally restrained variations on the same easing family
 * the app already uses (see the `cubic-bezier(0.16, 1, 0.3, 1)` curve behind
 * Tailwind's fade-in/scale-in/slide-up keyframes in tailwind.config.js) —
 * destination motion should feel like a mood shift within one product, not
 * five unrelated animation libraries.
 */

import type { Transition } from 'framer-motion';
import type { MotionPresetId } from './types';

export interface MotionPresetDefinition {
  transition: Transition;
  /** Suggested stagger delay (seconds) between children in a list/reveal sequence using this preset. */
  staggerChildren: number;
}

export const MOTION_PRESETS: Record<MotionPresetId, MotionPresetDefinition> = {
  // Minimal, elegant, unhurried — Japan.
  calm: {
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
    staggerChildren: 0.08,
  },
  // Clean and exact, no overshoot — Switzerland, Santorini.
  crisp: {
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
    staggerChildren: 0.04,
  },
  // A touch of energy and overshoot — festive/adventurous destinations.
  vivid: {
    transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    staggerChildren: 0.06,
  },
  // Slow, dramatic, weighty — Dubai.
  opulent: {
    transition: { duration: 0.8, ease: [0.19, 1, 0.22, 1] },
    staggerChildren: 0.1,
  },
  // Flowing, slightly irregular — Italy, Iceland.
  organic: {
    transition: { duration: 0.55, ease: [0.33, 1, 0.68, 1] },
    staggerChildren: 0.07,
  },
};

export function getMotionPreset(id: MotionPresetId): MotionPresetDefinition {
  return MOTION_PRESETS[id];
}
