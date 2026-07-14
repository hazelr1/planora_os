/**
 * The Undiscovered Protocol.
 *
 * When a trip's destination doesn't match anything in the hand-authored
 * registry, Planora still needs to hand every screen a complete, usable
 * `DestinationProfile` — not a blank fallback. This module is that
 * synthesis step: it takes whatever `DestinationMetadata` is known (usually
 * just what `inferMetadataFromFreeText` can pull from the raw string) and
 * composes a full profile out of the same small, restrained tables a
 * hand-authored destination would draw from — see metadataTags.ts.
 *
 * Design intent: a generated profile should feel *intentional*, not random.
 * That's why this is table-driven composition rather than randomization —
 * the same metadata always produces the same profile, every color traces
 * back to a real signal (a climate, a geography, a culture tag), and when
 * no signal is available at all, the result deliberately leans toward the
 * app's own default atmosphere rather than an arbitrary "generated-looking"
 * one. A generated destination is meant to be indistinguishable in quality
 * from a hand-authored one — only less specific when the underlying
 * signal is thinner.
 */

import { lighten, mix } from './colorMath';
import {
  ARCHITECTURE_LABEL, ARCHITECTURE_MOTIF, CLIMATE_LABEL, CLIMATE_PALETTE, CLIMATE_TEXTURE, CLIMATE_TRAVEL_INFO,
  CULTURE_LABEL, CULTURE_MOTION, CULTURE_VOICE, GEOGRAPHY_LABEL, GEOGRAPHY_MOTIF,
} from './metadataTags';
import type {
  DestinationDecorativeAsset, DestinationMetadata, DestinationProfile, MotifStroke, MotionPresetId,
} from './types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'undiscovered';
}

/**
 * Capitalizes the first letter of each word without touching the rest —
 * deliberately not a `\b\w` regex replace, since JavaScript's `\w` is
 * ASCII-only and treats accented letters (Kraków, Zürich, Reykjavík) as
 * word boundaries, which mangles exactly the kind of real place name this
 * function exists to handle correctly.
 */
function titleCase(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/**
 * A small, stable hash so a thin-signal destination gets *one* of a few
 * dignified fallback lines rather than always the same one — deterministic
 * (the same name always lands on the same line), not random.
 */
function stableIndex(name: string, modulus: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % modulus;
}

const THIN_SIGNAL_ESSENCE = (name: string) => [
  `${name} — an atmosphere still waiting to be defined.`,
  `${name} hasn't been given a signature look yet, so this one stays close to Planora's own.`,
  `Not enough is known yet about ${name} to say more than: it's on the map now.`,
];

function buildEssence(name: string, metadata: DestinationMetadata): string {
  const clauses: string[] = [];
  if (metadata.geography?.length) clauses.push(GEOGRAPHY_LABEL[metadata.geography[0]]);
  if (metadata.climate) clauses.push(CLIMATE_LABEL[metadata.climate]);
  if (metadata.culture?.length) clauses.push(CULTURE_LABEL[metadata.culture[0]]);
  if (!clauses.length) {
    const options = THIN_SIGNAL_ESSENCE(name);
    return options[stableIndex(name, options.length)];
  }
  return `${name}: ${clauses.join(', ')}.`;
}

const THIN_SIGNAL_QUOTE = (name: string) => [
  `There's a stillness to ${name} that's hard to name.`,
  `${name} hasn't been written up yet — that's part of its appeal.`,
  `Everyone who's been to ${name} describes it a little differently.`,
];

/** A restrained, single-clause pull-quote — deliberately shorter and more evocative than `essence`, never a full sentence of description. */
function buildQuote(name: string, metadata: DestinationMetadata): string {
  if (metadata.geography?.includes('coastal') || metadata.geography?.includes('island')) {
    return `${name} moves at the pace of the tide.`;
  }
  if (metadata.geography?.includes('mountain') || metadata.climate === 'alpine') {
    return `${name} rewards those willing to climb for the view.`;
  }
  if (metadata.geography?.includes('desert')) {
    return `${name} is quietest exactly when it looks emptiest.`;
  }
  if (metadata.geography?.includes('savanna')) {
    return `${name} moves at the pace of whatever's grazing nearby.`;
  }
  if (metadata.culture?.includes('spiritual')) {
    return `${name} asks you to slow down before it shows you anything.`;
  }
  if (metadata.culture?.includes('festive')) {
    return `${name} is always already mid-celebration.`;
  }
  const options = THIN_SIGNAL_QUOTE(name);
  return options[stableIndex(name, options.length)];
}

function buildMood(metadata: DestinationMetadata): string[] {
  const mood: string[] = [];
  if (metadata.climate) mood.push(metadata.climate);
  if (metadata.geography) mood.push(...metadata.geography);
  if (metadata.culture) mood.push(...metadata.culture);
  if (metadata.travelMood) mood.push(...metadata.travelMood);
  return mood.length ? [...new Set(mood)] : ['undiscovered'];
}

function buildMotif(metadata: DestinationMetadata): MotifStroke[] {
  const strokes: MotifStroke[] = [];
  if (metadata.geography?.length) strokes.push(GEOGRAPHY_MOTIF[metadata.geography[0]]);
  const architectureAccent = metadata.architecture?.find((tag) => ARCHITECTURE_MOTIF[tag]);
  if (architectureAccent) strokes.push(ARCHITECTURE_MOTIF[architectureAccent]!);
  // A quiet horizon line ties any combination together even when only one
  // signal is available — the same restrained, "handful of strokes" quality
  // as every hand-authored motif, never a busy or cluttered result.
  strokes.push({ kind: 'line', x1: 15, y1: 88, x2: 185, y2: 88, opacity: 0.25 });
  return strokes;
}

function buildDecorativeAssets(metadata: DestinationMetadata): DestinationDecorativeAsset[] {
  const assets: DestinationDecorativeAsset[] = [];
  metadata.geography?.forEach((tag) => assets.push({ label: GEOGRAPHY_LABEL[tag], kind: 'motif' }));
  metadata.architecture?.forEach((tag) => assets.push({ label: ARCHITECTURE_LABEL[tag], kind: 'symbol' }));
  return assets;
}

function buildMotion(metadata: DestinationMetadata): MotionPresetId {
  const cultureMotion = metadata.culture?.find((tag) => CULTURE_MOTION[tag]);
  return cultureMotion ? CULTURE_MOTION[cultureMotion] : 'calm';
}

export function synthesizeDestinationProfile(destinationText: string, metadata: DestinationMetadata): DestinationProfile {
  const name = titleCase(destinationText) || 'Undiscovered';
  const climate = metadata.climate ?? 'temperate';
  const climatePalette = CLIMATE_PALETTE[climate];
  const primaryCulture = metadata.culture?.find((tag) => CULTURE_VOICE[tag]);
  const voiceProfile = primaryCulture ? CULTURE_VOICE[primaryCulture] : { voice: ['warm', 'curious'], formality: 0.5, exuberance: 0.45 };
  const texture = CLIMATE_TEXTURE[climate];

  const brand400 = metadata.colorPalette?.[0] ?? climatePalette.brand400;
  const brand600 = metadata.colorPalette?.[1] ?? climatePalette.brand600;
  const brand300 = lighten(brand400, 0.55);
  const brand500 = mix(brand400, brand600, 0.4);
  const secondary = climatePalette.secondary;

  return {
    identity: {
      id: slugify(destinationText),
      name,
      region: metadata.country,
      aliases: [destinationText.toLowerCase()],
    },
    atmosphere: {
      mood: buildMood(metadata),
      essence: buildEssence(name, metadata),
      quote: buildQuote(name, metadata),
    },
    palette: {
      brand300,
      brand400,
      brand500,
      brand600,
      secondary,
      accent: { from: brand400, via: secondary, to: brand600 },
    },
    gradients: {
      hero: `linear-gradient(120deg, rgb(${brand300}) 0%, rgb(${brand400}) 45%, rgb(${brand600}) 100%)`,
      ambient: `linear-gradient(160deg, rgba(${brand400},0.12) 0%, rgba(${brand600},0.05) 100%)`,
    },
    imagery: {
      photographyStyle: metadata.photographyStyle ?? `${CLIMATE_LABEL[climate]}, drawn from ${name}'s own light`,
    },
    illustration: {
      treatment: 'single-stroke line art, restrained, matched to the app’s house style',
      paletteBias: primaryCulture === 'opulent' ? 'duotone' : 'muted',
    },
    iconStyle: {
      motif: buildMotif(metadata),
      strokeWeight: 'regular',
      cornerStyle: 'soft',
    },
    motion: buildMotion(metadata),
    texture,
    aiTone: {
      voice: voiceProfile.voice,
      formality: voiceProfile.formality,
      exuberance: voiceProfile.exuberance,
      sampleOpener: `Let's shape a trip to ${name} — I'll follow your lead as we learn its rhythm.`,
    },
    decorativeAssets: buildDecorativeAssets(metadata),
    travelInfo: CLIMATE_TRAVEL_INFO[climate],
  };
}
