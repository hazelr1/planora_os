/**
 * The registry: every hand-authored `DestinationProfile`. This is the *only*
 * file allowed to contain a destination's name as a literal string alongside
 * its own colors/motif/copy — everywhere else in the codebase (components,
 * the resolver, the Undiscovered Protocol) operates on `DestinationProfile`
 * values without knowing or caring which destination produced them.
 *
 * Adding a new hand-authored destination is one array entry here. Under the
 * previous system it was three separate edits in three separate files (a
 * THEMES map, a KEYWORD_MAP regex table, and a case in DestinationMotif's
 * switch) that had to be kept in sync by hand — that's exactly the kind of
 * hardcoding the brief asked to eliminate.
 *
 * A note on the Japan and Italy entries specifically: the original registry
 * had one broad "Japan" profile (aliased to Tokyo, Kyoto, Osaka, etc.) and
 * one broad "Italy" profile (aliased to Rome, Venice, Amalfi, etc.) — city
 * granularity the brief now explicitly asks for. Rather than layer new
 * Kyoto/Tokyo/Rome/Amalfi profiles *on top of* those broad ones (which would
 * leave two profiles matching the same alias, an ambiguity this engine has
 * no defined behavior for), the old "Japan" profile's copy — which was
 * already quiet/calm/unhurried in tone — was retuned into "Kyoto" specifically
 * (its personality fit Kyoto far better than a generic "Japan" catch-all),
 * a genuinely new "Tokyo" profile was authored for the modern/electric side
 * of Japan, and "Italy" was narrowed to drop the `rome`/`amalfi` aliases now
 * that those have their own dedicated profiles (it remains a sensible
 * fallback for Venice, Florence, Milan, Tuscany, Sicily, or an unspecified
 * "Italy"). Registry order matters for exactly this reason — more specific
 * profiles (Kyoto, Tokyo, Rome, Amalfi Coast) are listed before the broader
 * fallbacks they'd otherwise collide with (Italy), since matching returns
 * the first alias hit.
 */

import type { DestinationProfile } from './types';

const santorini: DestinationProfile = {
  identity: {
    id: 'santorini',
    name: 'Santorini',
    region: 'Cyclades, Greece',
    aliases: ['santorini', 'greece', 'greek', 'mykonos', 'athens', 'crete'],
  },
  atmosphere: {
    mood: ['bright', 'mediterranean', 'luxurious', 'airy'],
    essence: 'Whitewashed cliffs, blue domes, and the Aegean at golden hour.',
    quote: "Some places don't need to be found — they need to be arrived at slowly.",
  },
  palette: {
    brand300: '147 197 253',
    brand400: '59 130 246',
    brand500: '37 99 235',
    brand600: '29 78 216',
    secondary: '255 154 118',
    accent: { from: '37 99 235', via: '56 189 248', to: '255 255 255' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #FF9A76 0%, #FFD59E 28%, #4A90A4 68%, #1B4965 100%)',
    ambient: 'linear-gradient(160deg, rgba(74,144,164,0.12) 0%, rgba(27,73,101,0.05) 100%)',
  },
  imagery: { photographyStyle: 'golden hour, high contrast, whitewashed architecture against deep blue' },
  illustration: { treatment: 'single-stroke line art, no fill, sun-bleached restraint', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M60 70 a30 30 0 0 1 60 0' },
      { kind: 'line', x1: 60, y1: 70, x2: 120, y2: 70 },
      { kind: 'line', x1: 90, y1: 40, x2: 90, y2: 22 },
      { kind: 'line', x1: 82, y1: 28, x2: 98, y2: 28 },
      { kind: 'path', d: 'M0 88 Q 25 78 50 88 T 100 88 T 150 88 T 200 88', strokeWidth: 1, opacity: 0.6 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'soft',
  },
  motion: 'crisp',
  texture: { kind: 'wave-lines', intensity: 0.18 },
  aiTone: {
    voice: ['warm', 'breezy', 'a little poetic'],
    formality: 0.4,
    exuberance: 0.6,
    sampleOpener: "Golden hour's coming — let's chase it across the caldera.",
  },
  decorativeAssets: [
    { label: 'Blue-domed rooftop', kind: 'motif' },
    { label: 'Whitewashed staircase', kind: 'symbol' },
    { label: 'Bougainvillea sprig', kind: 'texture-detail' },
  ],
  travelInfo: {
    bestSeason: 'Late May to early October',
    weatherHint: 'Warm, dry summers with a steady Aegean breeze',
  },
};

const kyoto: DestinationProfile = {
  identity: {
    id: 'kyoto',
    name: 'Kyoto',
    region: 'Kansai, Japan',
    aliases: ['kyoto'],
  },
  atmosphere: {
    mood: ['quiet', 'zen', 'elegant'],
    essence: 'Quiet precision — soft wood, paper light, and seasonal detail that asks to be noticed slowly.',
    quote: 'Beauty here is never loud — it waits to be noticed.',
  },
  palette: {
    brand300: '250 214 224',
    brand400: '224 143 163',
    brand500: '196 108 132',
    brand600: '155 79 100',
    secondary: '139 94 60',
    accent: { from: '224 143 163', via: '196 108 132', to: '139 94 60' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #F7D9E3 0%, #E0A6B8 35%, #C97B7B 65%, #6B4A3A 100%)',
    ambient: 'linear-gradient(160deg, rgba(224,143,163,0.12) 0%, rgba(139,94,60,0.05) 100%)',
  },
  imagery: { photographyStyle: 'soft window light on wood and paper, one seasonal accent of color' },
  illustration: { treatment: 'single-stroke line art, generous whitespace, one accent mark', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'line', x1: 55, y1: 30, x2: 55, y2: 85 },
      { kind: 'line', x1: 145, y1: 30, x2: 145, y2: 85 },
      { kind: 'line', x1: 40, y1: 30, x2: 160, y2: 30 },
      { kind: 'line', x1: 48, y1: 42, x2: 152, y2: 42 },
      { kind: 'dot', cx: 30, cy: 55, r: 2.2, opacity: 0.7, filled: true },
      { kind: 'dot', cx: 172, cy: 65, r: 2.2, opacity: 0.6, filled: true },
      { kind: 'dot', cx: 180, cy: 50, r: 1.6, opacity: 0.5, filled: true },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'sharp',
  },
  motion: 'calm',
  texture: { kind: 'grain', intensity: 0.1 },
  aiTone: {
    voice: ['calm', 'precise', 'quietly warm'],
    formality: 0.7,
    exuberance: 0.25,
    sampleOpener: "Let's plan this with care — every detail in its place.",
  },
  decorativeAssets: [
    { label: 'Torii gate', kind: 'motif' },
    { label: 'Drifting blossom', kind: 'texture-detail' },
    { label: 'Paper lantern', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'Late March to May, or October to November',
    weatherHint: 'Mild spring and autumn air, humid summers',
  },
};

const tokyo: DestinationProfile = {
  identity: {
    id: 'tokyo',
    name: 'Tokyo',
    region: 'Kanto, Japan',
    aliases: ['tokyo'],
  },
  atmosphere: {
    mood: ['modern', 'electric', 'cosmopolitan'],
    essence: 'Neon over concrete — a city that never fully exhales.',
    quote: "Tokyo doesn't slow down for you, it just makes room.",
  },
  palette: {
    brand300: '251 182 206',
    brand400: '236 72 153',
    brand500: '190 46 120',
    brand600: '157 23 77',
    secondary: '56 189 248',
    accent: { from: '236 72 153', via: '157 23 77', to: '30 27 45' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #0B0B14 0%, #4A1942 40%, #D946EF 75%, #F472B6 100%)',
    ambient: 'linear-gradient(160deg, rgba(236,72,153,0.10) 0%, rgba(30,27,45,0.06) 100%)',
  },
  imagery: { photographyStyle: 'night neon reflections on wet pavement, dense layered signage' },
  illustration: { treatment: 'single-stroke line art, tall vertical proportions, one neon accent', paletteBias: 'duotone' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M40 85 L40 50 L55 50 L55 85 Z' },
      { kind: 'path', d: 'M65 85 L65 30 L82 30 L82 85 Z' },
      { kind: 'path', d: 'M92 85 L92 55 L104 55 L104 85 Z' },
      { kind: 'line', x1: 112, y1: 85, x2: 112, y2: 20 },
      { kind: 'dot', cx: 112, cy: 20, r: 2, opacity: 0.8, filled: true },
      { kind: 'dot', cx: 70, cy: 38, r: 1.4, opacity: 0.5, filled: true },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'sharp',
  },
  motion: 'vivid',
  texture: { kind: 'grain', intensity: 0.14 },
  aiTone: {
    voice: ['brisk', 'sharp', 'a little playful'],
    formality: 0.55,
    exuberance: 0.65,
    sampleOpener: "Let's move fast — this city rewards it.",
  },
  decorativeAssets: [
    { label: 'Neon signage glow', kind: 'texture-detail' },
    { label: 'Elevated train line', kind: 'symbol' },
    { label: 'Vending machine glow', kind: 'motif' },
  ],
  travelInfo: {
    bestSeason: 'Late March to May, or October to November',
    weatherHint: 'Humid summers, mild shoulder seasons, occasional typhoon in early autumn',
  },
};

const rome: DestinationProfile = {
  identity: {
    id: 'rome',
    name: 'Rome',
    region: 'Lazio, Italy',
    aliases: ['rome', 'roma'],
  },
  atmosphere: {
    mood: ['grand', 'historic', 'unhurried'],
    essence: "Layers of empire under a sky that hasn't changed in two thousand years.",
    quote: 'Everything in Rome has already survived something.',
  },
  palette: {
    brand300: '232 201 148',
    brand400: '201 140 58',
    brand500: '168 112 42',
    brand600: '128 84 32',
    secondary: '122 36 36',
    accent: { from: '201 140 58', via: '150 82 42', to: '90 30 30' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #F3E1BE 0%, #D9A15C 35%, #8B4A2B 65%, #5C1F1F 100%)',
    ambient: 'linear-gradient(160deg, rgba(201,140,58,0.12) 0%, rgba(90,30,30,0.05) 100%)',
  },
  imagery: { photographyStyle: 'warm travertine stone, long afternoon shadows, weathered gold' },
  illustration: { treatment: 'single-stroke line art, classical proportion, restrained ornament', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'line', x1: 70, y1: 30, x2: 70, y2: 80 },
      { kind: 'line', x1: 62, y1: 80, x2: 78, y2: 80 },
      { kind: 'line', x1: 63, y1: 28, x2: 77, y2: 28 },
      { kind: 'path', d: 'M100 80 a20 20 0 0 1 40 0' },
      { kind: 'line', x1: 100, y1: 80, x2: 140, y2: 80 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'sharp',
  },
  motion: 'opulent',
  texture: { kind: 'grain', intensity: 0.14 },
  aiTone: {
    voice: ['knowing', 'warm', 'a little theatrical'],
    formality: 0.55,
    exuberance: 0.5,
    sampleOpener: "Two thousand years of history, and we've still got a great trip to plan.",
  },
  decorativeAssets: [
    { label: 'Roman column', kind: 'motif' },
    { label: 'Weathered travertine', kind: 'texture-detail' },
    { label: 'Piazza fountain', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to June, or September to October',
    weatherHint: 'Hot, dry summers; mild and walkable shoulder seasons',
  },
};

const amalfiCoast: DestinationProfile = {
  identity: {
    id: 'amalfi-coast',
    name: 'Amalfi Coast',
    region: 'Campania, Italy',
    aliases: ['amalfi coast', 'amalfi', 'positano', 'sorrento', 'ravello'],
  },
  atmosphere: {
    mood: ['dramatic', 'coastal', 'glamorous'],
    essence: 'Cliffside towns that seem to grow straight out of the rock.',
    quote: 'The road here is half the destination.',
  },
  palette: {
    brand300: '186 230 253',
    brand400: '14 165 233',
    brand500: '3 105 161',
    brand600: '7 89 133',
    secondary: '250 204 21',
    accent: { from: '14 165 233', via: '253 224 71', to: '251 113 133' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #0EA5E9 0%, #38BDF8 30%, #FDE68A 65%, #FB7185 100%)',
    ambient: 'linear-gradient(160deg, rgba(14,165,233,0.12) 0%, rgba(251,113,133,0.05) 100%)',
  },
  imagery: { photographyStyle: 'saturated sea blue against sun-bleached pastel facades, steep verticality' },
  illustration: { treatment: 'single-stroke line art, terraced verticality, citrus accent', paletteBias: 'saturated' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M10 70 L60 70 L60 55 L110 55 L110 40 L160 40 L160 25 L195 25' },
      { kind: 'path', d: 'M40 85 Q 60 65 85 78' },
      { kind: 'dot', cx: 70, cy: 74, r: 3.2 },
      { kind: 'dot', cx: 80, cy: 80, r: 2.6 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'soft',
  },
  motion: 'organic',
  texture: { kind: 'wave-lines', intensity: 0.16 },
  aiTone: {
    voice: ['warm', 'vivid', 'a little glamorous'],
    formality: 0.4,
    exuberance: 0.6,
    sampleOpener: "Hold onto the view — we're about to plan something spectacular.",
  },
  decorativeAssets: [
    { label: 'Terraced cliffside', kind: 'motif' },
    { label: 'Lemon grove', kind: 'texture-detail' },
    { label: 'Cliffside villa', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'Late May to September',
    weatherHint: 'Hot, sunny summers with a cooling sea breeze',
  },
};

const italy: DestinationProfile = {
  identity: {
    id: 'italy',
    name: 'Italy',
    region: 'Southern Europe',
    aliases: ['italy', 'ital', 'venice', 'florence', 'milan', 'tuscany', 'sicily'],
  },
  atmosphere: {
    mood: ['warm', 'vintage', 'unhurried'],
    essence: 'Sun-warmed stone, citrus groves, and a table that never rushes.',
    quote: "Nothing here is rushed, least of all the good parts.",
  },
  palette: {
    brand300: '244 187 110',
    brand400: '210 122 84',
    brand500: '180 95 60',
    brand600: '143 74 46',
    secondary: '107 122 79',
    accent: { from: '193 101 61', via: '232 176 75', to: '107 122 79' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #C1653D 0%, #E8B04B 35%, #8a9a6a 70%, #4A5A35 100%)',
    ambient: 'linear-gradient(160deg, rgba(232,176,75,0.12) 0%, rgba(74,90,53,0.05) 100%)',
  },
  imagery: { photographyStyle: 'warm film grain, terracotta and olive tones, dappled light' },
  illustration: { treatment: 'loose single-stroke line art, slightly imperfect, hand-drawn warmth', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M70 85 C 60 70, 80 65, 70 50 C 82 45, 60 35, 70 22 L 70 85 Z' },
      { kind: 'path', d: 'M120 80 Q 145 60 170 70' },
      { kind: 'dot', cx: 150, cy: 66, r: 4 },
      { kind: 'dot', cx: 163, cy: 72, r: 3.2 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'soft',
  },
  motion: 'organic',
  texture: { kind: 'linen', intensity: 0.16 },
  aiTone: {
    voice: ['warm', 'unhurried', 'affectionate'],
    formality: 0.3,
    exuberance: 0.55,
    sampleOpener: "Pour something local — we've got a beautiful trip to shape.",
  },
  decorativeAssets: [
    { label: 'Cypress silhouette', kind: 'motif' },
    { label: 'Citrus branch', kind: 'texture-detail' },
    { label: 'Terracotta rooftop', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to June, or September to October',
    weatherHint: 'Warm days, long golden evenings',
  },
};

const switzerland: DestinationProfile = {
  identity: {
    id: 'switzerland',
    name: 'Switzerland',
    region: 'Central Europe',
    aliases: ['switzerland', 'swiss', 'alps', 'zurich', 'geneva', 'zermatt', 'interlaken'],
  },
  atmosphere: {
    mood: ['crisp', 'alpine', 'precise'],
    essence: 'Cold, clean air and mountains cut with exact, deliberate lines.',
    quote: "The air here feels like it's been rinsed clean.",
  },
  palette: {
    brand300: '134 239 172',
    brand400: '34 197 94',
    brand500: '21 128 61',
    brand600: '22 101 52',
    secondary: '255 255 255',
    accent: { from: '255 255 255', via: '184 216 197', to: '46 83 57' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #EAF2EE 0%, #B8D8C5 42%, #4d7a5f 72%, #2E5339 100%)',
    ambient: 'linear-gradient(160deg, rgba(184,216,197,0.14) 0%, rgba(46,83,57,0.05) 100%)',
  },
  imagery: { photographyStyle: 'clean high-altitude light, sharp contrast, minimal color' },
  illustration: { treatment: 'geometric single-stroke line art, precise angles, no embellishment', paletteBias: 'monochrome' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M20 82 L55 35 L80 62 L100 30 L130 82 Z' },
      { kind: 'path', d: 'M95 82 L128 45 L165 82 Z', opacity: 0.7 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'sharp',
  },
  motion: 'crisp',
  texture: { kind: 'topographic', intensity: 0.2 },
  aiTone: {
    voice: ['crisp', 'precise', 'quietly confident'],
    formality: 0.65,
    exuberance: 0.3,
    sampleOpener: "Clean lines, clear air — let's map this out precisely.",
  },
  decorativeAssets: [
    { label: 'Overlapping alpine peaks', kind: 'motif' },
    { label: 'Contour lines', kind: 'texture-detail' },
    { label: 'Cable car silhouette', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'June to September for trails, December to March for snow',
    weatherHint: 'Crisp and clear, cooler at altitude',
  },
};

const dubai: DestinationProfile = {
  identity: {
    id: 'dubai',
    name: 'Dubai',
    region: 'Arabian Peninsula',
    aliases: ['dubai', 'abu dhabi', 'emirates', 'uae'],
  },
  atmosphere: {
    mood: ['premium', 'luxurious', 'dramatic'],
    essence: 'Gold-lit towers rising out of the desert at dusk.',
    quote: 'Everything here was built to be seen at dusk.',
  },
  palette: {
    brand300: '250 220 100',
    brand400: '234 179 8',
    brand500: '202 138 4',
    brand600: '161 98 7',
    secondary: '10 10 10',
    accent: { from: '202 138 4', via: '74 59 16', to: '10 10 10' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #141414 0%, #3d2f0a 48%, #CA8A04 82%, #F5D061 100%)',
    ambient: 'linear-gradient(160deg, rgba(202,138,4,0.12) 0%, rgba(10,10,10,0.06) 100%)',
  },
  imagery: { photographyStyle: 'dusk skyline, gold and charcoal, dramatic scale' },
  illustration: { treatment: 'single-stroke line art, tall proportions, restrained lattice detail', paletteBias: 'duotone' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M100 15 L108 80 L92 80 Z' },
      { kind: 'line', x1: 70, y1: 80, x2: 130, y2: 80 },
      { kind: 'path', d: 'M60 80 L100 45 L140 80', opacity: 0.55 },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'sharp',
  },
  motion: 'opulent',
  texture: { kind: 'grain', intensity: 0.1 },
  aiTone: {
    voice: ['assured', 'polished', 'a little dazzling'],
    formality: 0.75,
    exuberance: 0.5,
    sampleOpener: "Let's build something that feels as big as the skyline.",
  },
  decorativeAssets: [
    { label: 'Tapered spire', kind: 'motif' },
    { label: 'Lattice screen', kind: 'texture-detail' },
    { label: 'Desert dune line', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'November to March',
    weatherHint: 'Hot and dry, mild winter evenings',
  },
};

const iceland: DestinationProfile = {
  identity: {
    id: 'iceland',
    name: 'Iceland',
    region: 'North Atlantic',
    aliases: ['iceland', 'reykjavik'],
  },
  atmosphere: {
    mood: ['elemental', 'ethereal', 'subarctic'],
    essence: 'Glacial light, black volcanic rock, and the aurora moving overhead.',
    quote: "The land still looks like it's being finished.",
  },
  palette: {
    brand300: '165 243 252',
    brand400: '34 211 238',
    brand500: '8 145 178',
    brand600: '21 94 117',
    secondary: '106 17 203',
    accent: { from: '34 211 238', via: '109 213 170', to: '106 17 203' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #0f2027 0%, #2c5364 32%, #6DD5AA 58%, #2193b0 78%, #6a11cb 100%)',
    ambient: 'linear-gradient(160deg, rgba(44,83,100,0.14) 0%, rgba(106,17,203,0.05) 100%)',
  },
  imagery: { photographyStyle: 'long exposure, deep blues and greens, vast empty landscape' },
  illustration: { treatment: 'flowing single-stroke line art, soft curvature, no straight edges', paletteBias: 'duotone' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M10 40 Q 60 10 110 35 T 190 30' },
      { kind: 'path', d: 'M10 58 Q 60 30 110 55 T 190 50', opacity: 0.7 },
      { kind: 'path', d: 'M10 76 Q 60 52 110 74 T 190 70', opacity: 0.45 },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'soft',
  },
  motion: 'organic',
  texture: { kind: 'topographic', intensity: 0.22 },
  aiTone: {
    voice: ['elemental', 'hushed', 'a little in awe'],
    formality: 0.35,
    exuberance: 0.4,
    sampleOpener: "Something ancient is waiting out there — let's go find it.",
  },
  decorativeAssets: [
    { label: 'Aurora band', kind: 'motif' },
    { label: 'Volcanic rock texture', kind: 'texture-detail' },
    { label: 'Glacial lagoon', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'June to August for daylight, September to March for the aurora',
    weatherHint: 'Cool and changeable — pack for every season',
  },
};

const paris: DestinationProfile = {
  identity: {
    id: 'paris',
    name: 'Paris',
    region: 'Île-de-France, France',
    aliases: ['paris', 'france'],
  },
  atmosphere: {
    mood: ['editorial', 'romantic', 'refined'],
    essence: 'Cream stone facades and a golden hour that lasts all evening.',
    quote: 'Paris was never in a hurry to impress you.',
  },
  palette: {
    brand300: '224 204 184',
    brand400: '196 150 140',
    brand500: '150 108 104',
    brand600: '90 68 82',
    secondary: '30 41 82',
    accent: { from: '196 150 140', via: '219 168 168', to: '30 41 82' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #EDE0D3 0%, #C9A99A 35%, #7B8CA6 65%, #1E2952 100%)',
    ambient: 'linear-gradient(160deg, rgba(196,150,140,0.12) 0%, rgba(30,41,82,0.05) 100%)',
  },
  imagery: { photographyStyle: 'soft cream stone, golden late-afternoon light, quiet side streets' },
  illustration: { treatment: 'single-stroke line art, wrought-iron scrollwork, restrained elegance', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M40 60 Q 50 45 60 60 Q 70 45 80 60 Q 90 45 100 60' },
      { kind: 'line', x1: 40, y1: 60, x2: 100, y2: 60 },
      { kind: 'line', x1: 120, y1: 35, x2: 120, y2: 75, opacity: 0.5 },
      { kind: 'dot', cx: 120, cy: 30, r: 2.4, opacity: 0.6 },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'soft',
  },
  motion: 'crisp',
  texture: { kind: 'linen', intensity: 0.14 },
  aiTone: {
    voice: ['warm', 'precise', 'a little wry'],
    formality: 0.6,
    exuberance: 0.4,
    sampleOpener: "Let's plan this properly — Paris rewards a little patience.",
  },
  decorativeAssets: [
    { label: 'Wrought-iron balcony', kind: 'motif' },
    { label: 'Café awning stripe', kind: 'texture-detail' },
    { label: 'Streetlamp glow', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to June, or September to October',
    weatherHint: 'Mild and often overcast, with long golden evenings in summer',
  },
};

const bali: DestinationProfile = {
  identity: {
    id: 'bali',
    name: 'Bali',
    region: 'Lesser Sunda Islands, Indonesia',
    aliases: ['bali'],
  },
  atmosphere: {
    mood: ['lush', 'spiritual', 'unhurried'],
    essence: 'Rice terraces, temple stone, and a stillness that follows you indoors.',
    quote: 'Nothing in Bali asks to be rushed.',
  },
  palette: {
    brand300: '134 208 181',
    brand400: '22 124 92',
    brand500: '17 100 74',
    brand600: '13 84 63',
    secondary: '196 120 80',
    accent: { from: '22 124 92', via: '45 190 180', to: '196 120 80' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #86D0B5 0%, #0D543F 45%, #C47850 100%)',
    ambient: 'linear-gradient(160deg, rgba(22,124,92,0.12) 0%, rgba(196,120,80,0.05) 100%)',
  },
  imagery: { photographyStyle: 'deep jungle green, warm temple stone, soft tropical haze' },
  illustration: { treatment: 'single-stroke line art, layered terracing, one temple silhouette', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M10 80 L60 80 L60 68 L110 68 L110 56 L160 56 L160 44 L195 44' },
      { kind: 'path', d: 'M85 44 L95 20 L90 44' },
      { kind: 'path', d: 'M105 44 L95 20 L100 44' },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'soft',
  },
  motion: 'organic',
  texture: { kind: 'topographic', intensity: 0.18 },
  aiTone: {
    voice: ['warm', 'grounded', 'a little reverent'],
    formality: 0.35,
    exuberance: 0.5,
    sampleOpener: "Let's build something unhurried — Bali has its own rhythm.",
  },
  decorativeAssets: [
    { label: 'Rice terrace', kind: 'motif' },
    { label: 'Temple stone carving', kind: 'texture-detail' },
    { label: 'Split gate silhouette', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to October (dry season)',
    weatherHint: 'Warm and humid year-round, with an afternoon shower in wet season',
  },
};

const newYork: DestinationProfile = {
  identity: {
    id: 'new-york',
    name: 'New York',
    region: 'New York, United States',
    aliases: ['new york', 'nyc', 'manhattan', 'brooklyn'],
  },
  atmosphere: {
    mood: ['ambitious', 'dense', 'sophisticated'],
    essence: "Brownstone warmth against a skyline that's always slightly on the move.",
    quote: "New York doesn't wait to see if you'll keep up.",
  },
  palette: {
    brand300: '224 196 140',
    brand400: '176 138 72',
    brand500: '140 108 56',
    brand600: '96 76 40',
    secondary: '51 65 85',
    accent: { from: '176 138 72', via: '96 76 40', to: '30 34 40' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #2B2F38 0%, #4B5563 40%, #B48C3C 75%, #E0C48C 100%)',
    ambient: 'linear-gradient(160deg, rgba(176,138,72,0.12) 0%, rgba(30,34,40,0.06) 100%)',
  },
  imagery: { photographyStyle: 'amber streetlight against dusk concrete, dense layered skyline' },
  illustration: { treatment: 'single-stroke line art, vertical density, one bridge-cable accent', paletteBias: 'duotone' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M20 85 L20 55 L35 55 L35 85 Z' },
      { kind: 'path', d: 'M42 85 L42 30 L58 30 L58 85 Z' },
      { kind: 'path', d: 'M65 85 L65 60 L78 60 L78 85 Z' },
      { kind: 'path', d: 'M120 85 Q 150 40 180 85', opacity: 0.5 },
      { kind: 'line', x1: 150, y1: 85, x2: 150, y2: 45, opacity: 0.4 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'sharp',
  },
  motion: 'crisp',
  texture: { kind: 'grain', intensity: 0.12 },
  aiTone: {
    voice: ['brisk', 'confident', 'a little dry'],
    formality: 0.55,
    exuberance: 0.5,
    sampleOpener: "Let's plan this efficiently — the city won't wait around.",
  },
  decorativeAssets: [
    { label: 'Brownstone stoop', kind: 'texture-detail' },
    { label: 'Suspension cable', kind: 'motif' },
    { label: 'Rooftop water tower', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to June, or September to November',
    weatherHint: 'Hot, humid summers; cold winters with occasional snow',
  },
};

const cappadocia: DestinationProfile = {
  identity: {
    id: 'cappadocia',
    name: 'Cappadocia',
    region: 'Central Anatolia, Türkiye',
    aliases: ['cappadocia', 'goreme'],
  },
  atmosphere: {
    mood: ['dreamlike', 'otherworldly', 'still'],
    essence: 'Fairy chimneys at dawn, and a sky quietly filling with balloons.',
    quote: 'Cappadocia looks unfinished in the best possible way.',
  },
  palette: {
    brand300: '247 214 189',
    brand400: '232 158 120',
    brand500: '202 128 96',
    brand600: '173 108 72',
    secondary: '181 152 196',
    accent: { from: '232 158 120', via: '214 140 140', to: '181 152 196' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #F7E4D4 0%, #F0C4A8 35%, #D99A8C 65%, #B5A0C4 100%)',
    ambient: 'linear-gradient(160deg, rgba(232,158,120,0.12) 0%, rgba(181,152,196,0.05) 100%)',
  },
  imagery: { photographyStyle: 'soft dawn pastels, eroded rock texture, balloons scattered across the sky' },
  illustration: { treatment: 'single-stroke line art, soft cone silhouettes, one balloon accent', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M50 85 L55 55 Q 58 48 61 55 L66 85 Z' },
      { kind: 'path', d: 'M75 85 L82 50 Q 85 42 88 50 L95 85 Z' },
      { kind: 'path', d: 'M120 40 a18 18 0 1 1 -0.1 0', opacity: 0.6 },
      { kind: 'line', x1: 120, y1: 58, x2: 120, y2: 68, opacity: 0.5 },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'soft',
  },
  motion: 'organic',
  texture: { kind: 'grain', intensity: 0.16 },
  aiTone: {
    voice: ['warm', 'unhurried', 'quietly amazed'],
    formality: 0.35,
    exuberance: 0.45,
    sampleOpener: "Set an early alarm for this one — the sunrise is part of the plan.",
  },
  decorativeAssets: [
    { label: 'Fairy chimney rock', kind: 'motif' },
    { label: 'Eroded sandstone texture', kind: 'texture-detail' },
    { label: 'Hot air balloon', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'April to June, or September to October',
    weatherHint: 'Mild by day, cool at dawn — balloon flights depend on calm wind',
  },
};

const marrakech: DestinationProfile = {
  identity: {
    id: 'marrakech',
    name: 'Marrakech',
    region: 'Morocco',
    aliases: ['marrakech', 'marrakesh', 'morocco'],
  },
  atmosphere: {
    mood: ['vivid', 'warm', 'hospitable'],
    essence: 'Terracotta walls, saffron light, and a souk that rewards wandering.',
    quote: 'Marrakech is best understood by getting a little lost in it.',
  },
  palette: {
    brand300: '232 178 148',
    brand400: '188 79 48',
    brand500: '156 62 36',
    brand600: '140 66 36',
    secondary: '20 109 119',
    accent: { from: '188 79 48', via: '217 157 56', to: '20 109 119' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #8C3A24 0%, #C15E35 35%, #D99D38 65%, #146E77 100%)',
    ambient: 'linear-gradient(160deg, rgba(188,79,48,0.12) 0%, rgba(20,109,119,0.05) 100%)',
  },
  imagery: { photographyStyle: 'terracotta walls, saffron and teal tilework, warm dust-filtered light' },
  illustration: { treatment: 'single-stroke line art, geometric lattice, one archway accent', paletteBias: 'saturated' },
  iconStyle: {
    motif: [
      { kind: 'path', d: 'M100 85 L100 55 a20 22 0 0 1 40 0 L140 85' },
      { kind: 'line', x1: 40, y1: 40, x2: 60, y2: 60 },
      { kind: 'line', x1: 60, y1: 40, x2: 40, y2: 60 },
      { kind: 'line', x1: 50, y1: 35, x2: 50, y2: 65, opacity: 0.4 },
    ],
    strokeWeight: 'regular',
    cornerStyle: 'sharp',
  },
  motion: 'vivid',
  texture: { kind: 'linen', intensity: 0.2 },
  aiTone: {
    voice: ['warm', 'expressive', 'generously hospitable'],
    formality: 0.4,
    exuberance: 0.65,
    sampleOpener: "Let's plan this with a little room to wander — that's half the point.",
  },
  decorativeAssets: [
    { label: 'Zellige tile lattice', kind: 'motif' },
    { label: 'Terracotta wall texture', kind: 'texture-detail' },
    { label: 'Horseshoe archway', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'March to May, or September to November',
    weatherHint: 'Hot, dry summers; mild and pleasant spring and autumn days',
  },
};

const maldives: DestinationProfile = {
  identity: {
    id: 'maldives',
    name: 'Maldives',
    region: 'South Asia',
    aliases: ['maldives'],
  },
  atmosphere: {
    mood: ['serene', 'minimal', 'indulgent'],
    essence: 'Overwater stillness, and a horizon with nothing else on it.',
    quote: 'There is very little to do in the Maldives, on purpose.',
  },
  palette: {
    brand300: '173 232 232',
    brand400: '45 190 190',
    brand500: '34 152 152',
    brand600: '27 130 130',
    secondary: '242 192 160',
    accent: { from: '45 190 190', via: '242 192 160', to: '240 150 130' },
  },
  gradients: {
    hero: 'linear-gradient(120deg, #AEE8E8 0%, #2DBEBE 40%, #F2C0A0 75%, #F0957D 100%)',
    ambient: 'linear-gradient(160deg, rgba(45,190,190,0.12) 0%, rgba(240,150,130,0.05) 100%)',
  },
  imagery: { photographyStyle: 'pale turquoise shallows, sand-toned wood, wide uninterrupted horizon' },
  illustration: { treatment: 'single-stroke line art, low horizon, one overwater silhouette', paletteBias: 'muted' },
  iconStyle: {
    motif: [
      { kind: 'line', x1: 60, y1: 55, x2: 60, y2: 80 },
      { kind: 'line', x1: 90, y1: 55, x2: 90, y2: 80 },
      { kind: 'path', d: 'M50 55 L100 55 L95 45 L55 45 Z' },
      { kind: 'path', d: 'M0 85 Q 30 78 60 85 T 120 85 T 180 85 T 200 85', opacity: 0.5 },
    ],
    strokeWeight: 'thin',
    cornerStyle: 'soft',
  },
  motion: 'calm',
  texture: { kind: 'wave-lines', intensity: 0.1 },
  aiTone: {
    voice: ['calm', 'warm', 'quietly indulgent'],
    formality: 0.4,
    exuberance: 0.3,
    sampleOpener: "Let's plan for doing very little, very well.",
  },
  decorativeAssets: [
    { label: 'Overwater villa', kind: 'motif' },
    { label: 'Lagoon shallows', kind: 'texture-detail' },
    { label: 'Palm silhouette', kind: 'symbol' },
  ],
  travelInfo: {
    bestSeason: 'November to April (dry season)',
    weatherHint: 'Warm and humid year-round, with a wetter monsoon season mid-year',
  },
};

/**
 * Order matters: more specific profiles are listed before broader
 * fallbacks they could otherwise be shadowed by (Kyoto/Tokyo before no
 * generic "Japan" exists at all; Rome/Amalfi Coast before the broader
 * Italy fallback). Matching returns the first alias hit — see match.ts.
 */
export const DESTINATION_REGISTRY: DestinationProfile[] = [
  santorini,
  kyoto,
  tokyo,
  rome,
  amalfiCoast,
  italy,
  switzerland,
  dubai,
  iceland,
  paris,
  bali,
  newYork,
  cappadocia,
  marrakech,
  maldives,
];
