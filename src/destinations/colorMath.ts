/** Small RGB-triplet helpers for deriving a generated palette's in-between shades. */

import type { RGBTriplet } from './types';

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
