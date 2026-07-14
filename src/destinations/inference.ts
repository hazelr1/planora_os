/**
 * Turns a trip's free-text destination string into `DestinationMetadata` —
 * the only input the Undiscovered Protocol can rely on always being
 * present. This is deliberately keyword-based rather than a model call: it
 * has to run synchronously, in a React render, with no network and no API
 * key, so that `resolveDestinationExperience` stays a plain synchronous
 * function every component can call directly (see resolve.ts and
 * useDestinationExperience.ts).
 *
 * A hint can contribute to more than one tag family at once (e.g. "coastal"
 * implies both a geography and, weakly, a climate), and multiple hints can
 * fire for the same string — geography/architecture/culture accumulate as
 * arrays; climate keeps the first match, since a place doesn't have two
 * climates.
 */

import type { DestinationMetadata } from './types';

interface KeywordHint {
  pattern: RegExp;
  metadata: DestinationMetadata;
}

const KEYWORD_HINTS: KeywordHint[] = [
  { pattern: /beach|coast|island|caribbean|hawaii|seychelles|fiji|zanzibar|phuket|goa|croatia|philippines/i,
    metadata: { geography: ['coastal', 'island'], climate: 'tropical', culture: ['rustic'] } },
  { pattern: /desert|sahara|dune|jordan|petra|namib|oman|egypt/i,
    metadata: { geography: ['desert'], climate: 'desert', architecture: ['historic'] } },
  { pattern: /mountain|himalay|andes|rocky|nepal|patagonia|dolomites|pyrenees/i,
    metadata: { geography: ['mountain'], climate: 'alpine' } },
  { pattern: /\bski\b|snow|glacier|winter resort/i,
    metadata: { geography: ['mountain'], climate: 'alpine', culture: ['opulent'] } },
  { pattern: /volcano|volcanic|etna/i,
    metadata: { geography: ['volcanic'] } },
  { pattern: /safari|savanna|serengeti|kenya|tanzania|maasai|kruger/i,
    metadata: { geography: ['savanna'], climate: 'tropical', culture: ['rustic'] } },
  { pattern: /london|singapore|hong kong|shanghai|seoul|\bcity\b|urban|metropol|downtown/i,
    metadata: { geography: ['urban'], culture: ['cosmopolitan'], architecture: ['high-rise', 'modernist'] } },
  { pattern: /temple|shrine|monastery|spiritual|pilgrimage|tibet|bhutan|angkor|sacred/i,
    metadata: { culture: ['spiritual'], architecture: ['historic'] } },
  { pattern: /ruins|ancient|archaeolog|acropolis|colosseum|pyramids|machu picchu|pompeii/i,
    metadata: { culture: ['spiritual'], architecture: ['historic'] } },
  { pattern: /carnival|festival|rio|new orleans|ibiza|mardi gras/i,
    metadata: { culture: ['festive'] } },
  { pattern: /village|countryside|farmhouse|vineyard|wine country|provence|douro|napa/i,
    metadata: { culture: ['rustic', 'artisanal'], climate: 'mediterranean' } },
  { pattern: /palace|resort|five.?star|luxury|private villa/i,
    metadata: { culture: ['opulent'] } },
  { pattern: /lake|fjord|loch/i,
    metadata: { geography: ['lake'] } },
  { pattern: /river|canal|delta|riverside/i,
    metadata: { geography: ['lake'], culture: ['artisanal'] } },
  { pattern: /forest|rainforest|jungle|amazon|borneo/i,
    metadata: { geography: ['forest'], climate: 'tropical' } },
  { pattern: /market|souk|bazaar|artisan|craft/i,
    metadata: { culture: ['artisanal'] } },
];

export function inferMetadataFromFreeText(destinationText: string): DestinationMetadata {
  const result: DestinationMetadata = {};
  for (const hint of KEYWORD_HINTS) {
    if (!hint.pattern.test(destinationText)) continue;
    if (hint.metadata.climate && !result.climate) result.climate = hint.metadata.climate;
    if (hint.metadata.geography) result.geography = [...new Set([...(result.geography ?? []), ...hint.metadata.geography])];
    if (hint.metadata.architecture) result.architecture = [...new Set([...(result.architecture ?? []), ...hint.metadata.architecture])];
    if (hint.metadata.culture) result.culture = [...new Set([...(result.culture ?? []), ...hint.metadata.culture])];
  }
  return result;
}

/**
 * Extension seam. The keyword heuristics above are intentionally shallow —
 * they exist to make the Undiscovered Protocol work today, offline, for
 * free. A future strategy backed by the app's existing OpenRouter
 * integration (see supabase/functions/generate-itinerary) could infer far
 * richer metadata (actual climate, real architectural style, genuine
 * cultural mood) from the same destination string.
 *
 * That richer strategy is deliberately *not* implemented here — doing so
 * would mean either faking a model call (a placeholder) or wiring a live
 * network dependency into what needs to stay a synchronous render-time
 * path. Instead, this interface documents the seam: a future strategy only
 * has to satisfy `infer()`, and only ever needs to be consulted ahead of
 * time (e.g. once, when a trip is created) to enrich metadata that then
 * flows through the same `synthesizeDestinationProfile` used today.
 */
export interface MetadataInferenceStrategy {
  infer(destinationText: string): Promise<Partial<DestinationMetadata>>;
}

export const keywordInferenceStrategy: MetadataInferenceStrategy = {
  async infer(destinationText) {
    return inferMetadataFromFreeText(destinationText);
  },
};
