/** Small RGB-triplet helpers for deriving a generated palette's in-between shades. */

import type { DestinationGradients, RGBTriplet } from './types';

function parse(triplet: RGBTriplet): [number, number, number] {
  const [r, g, b] = triplet.split(' ').map(Number);
  return [r, g, b];
}

function format([r, g, b]: [number, number, number]): RGBTriplet {
  return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
}

export function mix(a: RGBTriplet, b: RGBTriplet, t: number): RGBTriplet {
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return format([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export function lighten(triplet: RGBTriplet, amount: number): RGBTriplet {
  return mix(triplet, '255 255 255', amount);
}

/**
 * The one place a generated profile's gradient CSS gets written. Both the
 * Undiscovered Protocol and the AI World Generator (see aiWorld.ts) only
 * ever supply three color anchors — never a CSS string themselves — and
 * this template is what turns those anchors into `DestinationGradients`.
 * Keeping the template in exactly one place means a hand-authored profile,
 * a deterministically-synthesized one, and an AI-generated one all produce
 * gradients built the same way, and tuning the look later is a one-line change.
 */
export function buildDestinationGradients(brand300: RGBTriplet, brand400: RGBTriplet, brand600: RGBTriplet): DestinationGradients {
  return {
    hero: `linear-gradient(120deg, rgb(${brand300}) 0%, rgb(${brand400}) 45%, rgb(${brand600}) 100%)`,
    ambient: `linear-gradient(160deg, rgba(${brand400},0.12) 0%, rgba(${brand600},0.05) 100%)`,
  };
}
