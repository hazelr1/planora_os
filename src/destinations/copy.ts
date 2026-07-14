/**
 * Content projection — the copy equivalent of tokens/deriveExperienceTokens.ts.
 *
 * Deliberately kept separate from `ExperienceTokens`: tokens are design
 * values (how something should look), copy is words (what it should say).
 * A component rendering a destination's name, quote, or AI greeting isn't
 * making a style decision, so it doesn't belong in the tokens schema — but
 * it's exactly the same principle in practice: components read this
 * instead of reaching into `DestinationProfile` themselves.
 */

import type { DestinationProfile } from './types';

export interface ExperienceCopy {
  name: string;
  region?: string;
  /** Descriptive overview line — factual/atmospheric, not emotional (see `quote` for that). */
  essence: string;
  /** Evocative editorial pull-quote. */
  quote: string;
  mood: string[];
  /** Static, illustrative guidance — never live weather/season data. See DestinationTravelInfo in types.ts. */
  bestSeason: string;
  weatherHint: string;
  /** The AI concierge's opening line for this destination, in its authored voice. */
  aiGreeting: string;
}

export function deriveExperienceCopy(profile: DestinationProfile): ExperienceCopy {
  return {
    name: profile.identity.name,
    region: profile.identity.region,
    essence: profile.atmosphere.essence,
    quote: profile.atmosphere.quote,
    mood: profile.atmosphere.mood,
    bestSeason: profile.travelInfo.bestSeason,
    weatherHint: profile.travelInfo.weatherHint,
    aiGreeting: profile.aiTone.sampleOpener,
  };
}

/** Used whenever theming policy suppresses an experience (see policy.ts) — no destination copy should render in that case, so every field is intentionally empty/neutral. */
export const DEFAULT_EXPERIENCE_COPY: ExperienceCopy = {
  name: '',
  essence: '',
  quote: '',
  mood: [],
  bestSeason: '',
  weatherHint: '',
  aiGreeting: '',
};
