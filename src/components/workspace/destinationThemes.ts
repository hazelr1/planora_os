export type DestinationThemeId =
  | 'santorini' | 'japan' | 'italy' | 'switzerland' | 'dubai' | 'iceland' | 'default';

export interface DestinationTheme {
  id: DestinationThemeId;
  name: string;
  /** Overrides for --brand-300..600 — kept legible/accessible (not the full decorative hero palette). */
  brand: { 300: string; 400: string; 500: string; 600: string };
  /** Overrides for --accent-from/via/to, used by .btn-primary within scope. */
  accent: { from: string; via: string; to: string };
  /** Decorative only — hero banner background, never used for text. */
  heroGradient: string;
}

const THEMES: Record<Exclude<DestinationThemeId, 'default'>, DestinationTheme> = {
  santorini: {
    id: 'santorini',
    name: 'Santorini',
    brand: { 300: '147 197 253', 400: '59 130 246', 500: '37 99 235', 600: '29 78 216' },
    accent: { from: '37 99 235', via: '56 189 248', to: '255 255 255' },
    heroGradient: 'linear-gradient(120deg, #FF9A76 0%, #FFD59E 28%, #4A90A4 68%, #1B4965 100%)',
  },
  japan: {
    id: 'japan',
    name: 'Japan',
    brand: { 300: '252 165 165', 400: '239 68 68', 500: '220 38 38', 600: '153 27 27' },
    accent: { from: '220 38 38', via: '127 29 29', to: '17 17 17' },
    heroGradient: 'linear-gradient(120deg, #7F1D1D 0%, #DC2626 38%, #2a1414 75%, #111111 100%)',
  },
  italy: {
    id: 'italy',
    name: 'Italy',
    brand: { 300: '244 187 110', 400: '210 122 84', 500: '180 95 60', 600: '143 74 46' },
    accent: { from: '193 101 61', via: '232 176 75', to: '107 122 79' },
    heroGradient: 'linear-gradient(120deg, #C1653D 0%, #E8B04B 35%, #8a9a6a 70%, #4A5A35 100%)',
  },
  switzerland: {
    id: 'switzerland',
    name: 'Switzerland',
    brand: { 300: '134 239 172', 400: '34 197 94', 500: '21 128 61', 600: '22 101 52' },
    accent: { from: '255 255 255', via: '184 216 197', to: '46 83 57' },
    heroGradient: 'linear-gradient(120deg, #EAF2EE 0%, #B8D8C5 42%, #4d7a5f 72%, #2E5339 100%)',
  },
  dubai: {
    id: 'dubai',
    name: 'Dubai',
    brand: { 300: '250 220 100', 400: '234 179 8', 500: '202 138 4', 600: '161 98 7' },
    accent: { from: '202 138 4', via: '74 59 16', to: '10 10 10' },
    heroGradient: 'linear-gradient(120deg, #141414 0%, #3d2f0a 48%, #CA8A04 82%, #F5D061 100%)',
  },
  iceland: {
    id: 'iceland',
    name: 'Iceland',
    brand: { 300: '165 243 252', 400: '34 211 238', 500: '8 145 178', 600: '21 94 117' },
    accent: { from: '34 211 238', via: '109 213 170', to: '106 17 203' },
    heroGradient: 'linear-gradient(120deg, #0f2027 0%, #2c5364 32%, #6DD5AA 58%, #2193b0 78%, #6a11cb 100%)',
  },
};

const KEYWORD_MAP: [RegExp, DestinationThemeId][] = [
  [/santorini|greece|greek|mykonos|athens|crete/i, 'santorini'],
  [/japan|tokyo|kyoto|osaka|okinawa|hokkaido|nara/i, 'japan'],
  [/italy|ital|rome|venice|florence|milan|tuscany|amalfi|sicily/i, 'italy'],
  [/switzerland|swiss|alps|zurich|geneva|zermatt|interlaken/i, 'switzerland'],
  [/dubai|abu dhabi|emirates|\buae\b/i, 'dubai'],
  [/iceland|reykjavik/i, 'iceland'],
];

/** Best-effort match on the free-text destination string. Falls back to 'default' (no override — the app's normal turquoise theme). */
export function detectDestinationTheme(destination: string): DestinationThemeId {
  for (const [pattern, id] of KEYWORD_MAP) {
    if (pattern.test(destination)) return id;
  }
  return 'default';
}

export function getDestinationTheme(id: DestinationThemeId): DestinationTheme | null {
  return id === 'default' ? null : THEMES[id];
}
