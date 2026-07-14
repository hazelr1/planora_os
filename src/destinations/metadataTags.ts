/**
 * Small, composable lookup tables that translate `DestinationMetadata` tags
 * into concrete design decisions — a palette bias, a motif stroke, a
 * texture, a motion preset, a label. This is the "intelligence" behind the
 * Undiscovered Protocol: it's deliberately made of tables, not prose
 * generation, so it's deterministic, instant, offline, and easy to extend
 * (add a row, not a new code path) as more tags get recognized over time.
 *
 * Every table is keyed by the same tag unions declared in types.ts, so
 * adding a new tag value is a compile-time-checked, one-line addition to
 * each table that cares about it.
 */

import type {
  ArchitectureTag, ClimateTag, CultureTag, GeographyTag, MotifStroke, MotionPresetId, RGBTriplet,
} from './types';

export const CLIMATE_LABEL: Record<ClimateTag, string> = {
  tropical: 'a tropical climate',
  mediterranean: 'a mediterranean climate',
  alpine: 'crisp alpine air',
  desert: 'dry desert heat',
  temperate: 'a mild, temperate climate',
  arctic: 'a cold, subarctic climate',
};

/**
 * brand400/brand600 anchors plus a supporting secondary hue, per climate —
 * the raw material a generated palette is built from in undiscoveredProtocol.ts.
 */
export const CLIMATE_PALETTE: Record<ClimateTag, { brand400: RGBTriplet; brand600: RGBTriplet; secondary: RGBTriplet }> = {
  tropical: { brand400: '16 185 129', brand600: '4 120 87', secondary: '250 204 21' },
  mediterranean: { brand400: '37 99 235', brand600: '29 78 216', secondary: '253 186 116' },
  alpine: { brand400: '34 197 94', brand600: '22 101 52', secondary: '241 245 249' },
  desert: { brand400: '234 179 8', brand600: '161 98 7', secondary: '194 65 12' },
  // Deliberately close to the app's own default brand teal (see src/index.css
  // --brand-400/600) — when nothing distinctive is known about a place, the
  // generated theme should read as "the app's normal atmosphere," not a
  // jarring random color. Distinctiveness should come from real signal.
  temperate: { brand400: '20 184 166', brand600: '15 118 110', secondary: '148 163 184' },
  arctic: { brand400: '34 211 238', brand600: '21 94 117', secondary: '129 140 248' },
};

/** Static, illustrative travel guidance per climate — see DestinationTravelInfo in types.ts for why this must never be presented as live data. */
export const CLIMATE_TRAVEL_INFO: Record<ClimateTag, { bestSeason: string; weatherHint: string }> = {
  tropical: { bestSeason: 'The dry season, when it falls locally', weatherHint: 'Warm and humid, with a chance of sudden rain' },
  mediterranean: { bestSeason: 'Late spring to early autumn', weatherHint: 'Warm, dry days and mild evenings' },
  alpine: { bestSeason: 'Summer for trails, winter for snow', weatherHint: 'Crisp and cool, colder at altitude' },
  desert: { bestSeason: 'The cooler months, outside peak summer heat', weatherHint: 'Hot and dry by day, cool after dark' },
  temperate: { bestSeason: 'Spring or early autumn', weatherHint: 'Mild and changeable — worth packing layers' },
  arctic: { bestSeason: 'Summer for daylight, winter for the aurora', weatherHint: 'Cold and clear, with fast-changing skies' },
};

export const CLIMATE_TEXTURE: Record<ClimateTag, { kind: 'grain' | 'wave-lines' | 'topographic' | 'none'; intensity: number }> = {
  tropical: { kind: 'wave-lines', intensity: 0.14 },
  mediterranean: { kind: 'wave-lines', intensity: 0.12 },
  alpine: { kind: 'topographic', intensity: 0.18 },
  desert: { kind: 'grain', intensity: 0.14 },
  temperate: { kind: 'none', intensity: 0 },
  arctic: { kind: 'topographic', intensity: 0.16 },
};

export const GEOGRAPHY_LABEL: Record<GeographyTag, string> = {
  coastal: 'a long stretch of coastline',
  island: 'an island setting',
  mountain: 'mountains on the skyline',
  desert: 'open desert',
  forest: 'dense forest',
  urban: 'a dense, vertical city',
  volcanic: 'volcanic terrain',
  lake: 'still lake water',
  savanna: 'open savanna grassland',
};

/** A single restrained motif stroke per geography tag — the generated equivalent of Switzerland's peaks or Santorini's wave line. */
export const GEOGRAPHY_MOTIF: Record<GeographyTag, MotifStroke> = {
  coastal: { kind: 'path', d: 'M0 82 Q 30 68 60 82 T 120 82 T 180 82 T 240 82', strokeWidth: 1, opacity: 0.6 },
  island: { kind: 'path', d: 'M40 78 Q 100 55 160 78', opacity: 0.65 },
  mountain: { kind: 'path', d: 'M20 82 L60 40 L90 65 L120 32 L160 82 Z' },
  desert: { kind: 'path', d: 'M10 80 Q 55 55 100 78 T 190 75', opacity: 0.6 },
  forest: { kind: 'line', x1: 100, y1: 20, x2: 100, y2: 85 },
  urban: { kind: 'path', d: 'M60 85 L60 30 L85 30 L85 85 M105 85 L105 15 L130 15 L130 85' },
  volcanic: { kind: 'path', d: 'M40 82 L100 20 L160 82 Z' },
  lake: { kind: 'path', d: 'M10 80 Q 60 72 110 80 T 190 78', opacity: 0.5 },
  savanna: { kind: 'path', d: 'M0 84 L200 84 M40 84 L40 60 L44 84 M100 84 L100 55 L104 84 M150 84 L150 65 L154 84', opacity: 0.55 },
};

export const ARCHITECTURE_LABEL: Record<ArchitectureTag, string> = {
  whitewashed: 'whitewashed buildings',
  domed: 'domed rooftops',
  timber: 'timber-framed buildings',
  'high-rise': 'high-rise towers',
  historic: 'historic architecture',
  modernist: 'modernist architecture',
  'coastal-vernacular': 'coastal vernacular architecture',
};

/** A single accent stroke layered on top of the geography motif, when a distinctive architectural style is known. */
export const ARCHITECTURE_MOTIF: Partial<Record<ArchitectureTag, MotifStroke>> = {
  domed: { kind: 'path', d: 'M85 62 a15 15 0 0 1 30 0', opacity: 0.7 },
  'high-rise': { kind: 'path', d: 'M96 15 L104 78 L88 78 Z', opacity: 0.6 },
  timber: { kind: 'path', d: 'M75 70 L100 45 L125 70', opacity: 0.6 },
};

export const CULTURE_LABEL: Record<CultureTag, string> = {
  minimalist: 'a minimalist, unhurried character',
  festive: 'a festive, sociable character',
  artisanal: 'an artisanal, handmade character',
  opulent: 'an opulent, dramatic character',
  spiritual: 'a spiritual, contemplative character',
  rustic: 'a rustic, unpolished character',
  cosmopolitan: 'a cosmopolitan, fast-moving character',
};

export const CULTURE_MOTION: Record<CultureTag, MotionPresetId> = {
  minimalist: 'calm',
  spiritual: 'calm',
  rustic: 'organic',
  artisanal: 'organic',
  festive: 'vivid',
  opulent: 'opulent',
  cosmopolitan: 'crisp',
};

export const CULTURE_VOICE: Record<CultureTag, { voice: string[]; formality: number; exuberance: number }> = {
  minimalist: { voice: ['calm', 'precise'], formality: 0.65, exuberance: 0.25 },
  spiritual: { voice: ['hushed', 'thoughtful'], formality: 0.55, exuberance: 0.2 },
  rustic: { voice: ['warm', 'unhurried'], formality: 0.3, exuberance: 0.45 },
  artisanal: { voice: ['warm', 'attentive'], formality: 0.4, exuberance: 0.4 },
  festive: { voice: ['upbeat', 'sociable'], formality: 0.3, exuberance: 0.7 },
  opulent: { voice: ['assured', 'polished'], formality: 0.75, exuberance: 0.5 },
  cosmopolitan: { voice: ['brisk', 'confident'], formality: 0.6, exuberance: 0.45 },
};
