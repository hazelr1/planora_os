import type { TravelPace } from '../types';
import type { TripPreferenceTags } from '../data';

/*
A simple, deterministic heuristic — no AI call needed for tags this coarse.
The exact same thresholds/keywords are duplicated (not imported — edge
functions run in Deno, not this Vite/browser bundle) into
generate-itinerary and generate-trip-from-text, which derive these same
tags server-side right after a trip is created, since they already have
every input in hand. This client-side copy exists for the one edit surface
that never touches an edge function: SettingsSection's budget/currency
edit (see useTrips.updateTripFields).

Every field on the input is independent — pass only what you actually have
signal for (e.g. a budget-only edit passes no `freeText` and no `pace`),
and the caller is expected to merge the result via
profileRepository.updatePreferences, never overwrite a profile's whole
preferences blob with a partial derivation.
*/

const KIDS_KEYWORDS = [
  'kid', 'kids', 'child', 'children', 'toddler', 'family friendly', 'family-friendly', 'stroller', 'baby', 'infant',
];

function paceTag(pace: TravelPace | undefined): TripPreferenceTags['pace'] | undefined {
  if (pace === 'Relaxed') return 'slow';
  if (pace === 'Packed') return 'packed';
  if (pace === 'Balanced') return 'moderate';
  return undefined;
}

function budgetTierTag(budget: number, travelers: number, days: number): TripPreferenceTags['budgetTier'] | undefined {
  if (!budget || !travelers || !days) return undefined;
  const perDayPerTraveler = budget / travelers / days;
  if (perDayPerTraveler < 100) return 'budget';
  if (perDayPerTraveler < 300) return 'mid-range';
  return 'luxury';
}

function travelsWithKidsTag(freeText: string): TripPreferenceTags['travelsWithKids'] {
  const lower = freeText.toLowerCase();
  return KIDS_KEYWORDS.some((kw) => lower.includes(kw)) ? 'yes' : 'no';
}

export interface DeriveTagsInput {
  pace?: TravelPace;
  /** Omit entirely when there's no free text to scan (e.g. a budget-only edit) — only present when caller has real signal. */
  freeText?: string;
  budget: number;
  travelers: number;
  days: number;
}

export function deriveTripPreferenceTags(input: DeriveTagsInput): Partial<TripPreferenceTags> {
  const tags: Partial<TripPreferenceTags> = {};

  const pace = paceTag(input.pace);
  if (pace) tags.pace = pace;

  if (input.freeText !== undefined) {
    tags.travelsWithKids = travelsWithKidsTag(input.freeText);
  }

  const budgetTier = budgetTierTag(input.budget, input.travelers, input.days);
  if (budgetTier) tags.budgetTier = budgetTier;

  return tags;
}

/** Inclusive day count between two YYYY-MM-DD dates. */
export function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

/** Short, human-readable summary for the "Using your preferences" badge tooltip. */
export function summarizePreferenceTags(tags: TripPreferenceTags): string {
  const parts: string[] = [];
  if (tags.pace) parts.push(`${tags.pace} pace`);
  if (tags.travelsWithKids === 'yes') parts.push('traveling with kids');
  if (tags.budgetTier) parts.push(`${tags.budgetTier} budget`);
  return parts.join(' · ');
}
