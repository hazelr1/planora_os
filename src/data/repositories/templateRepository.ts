/**
 * templateRepository.ts
 *
 * Manages "suggested trip plans" — curated, non-user-owned itineraries
 * (trip_templates / template_days / template_activities) that any
 * authenticated user can browse and preview.
 *
 * Deliberately separate from ITripRepository: a template isn't a Trip a
 * user owns, it's read-only shared content until the moment someone clones
 * it, so it gets its own narrow interface rather than stretching Trip's
 * CRUD surface to cover a fundamentally different ownership model.
 */

import type { Trip } from '../../types';
import type { Result } from '../databaseErrors';

// ─── Input / output types ─────────────────────────────────────────────────────

/** Lightweight listing shape for the browse view — no day/activity detail. */
export interface TripTemplateSummary {
  id: string;
  title: string;
  destination: string;
  country: string;
  continent: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  summary: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ITemplateRepository {
  /**
   * A random sample of up to `limit` approved templates for a continent
   * (default 15) — the picker no longer has a country step, so this reads
   * across every country in the continent's pool at once. Order and
   * selection are randomized per call: different users (and repeat visits)
   * see a different slice/order of the same shared pool, not a fixed list.
   * Zero rows is a valid, expected result for a continent that hasn't been
   * seeded yet, not an error.
   */
  listTemplatesForContinent(continent: string, limit?: number): Promise<Result<TripTemplateSummary[]>>;

  /**
   * A single template with all days and activities, mapped into the same
   * `Trip` shape the Workspace UI already renders — so previewing a
   * template can reuse the real trip-display components as-is. The
   * returned `Trip.id` is the template's id; there is no real trip row
   * behind it until `cloneTemplateIntoTrip` is called.
   */
  getTemplateWithDetails(id: string): Promise<Result<Trip>>;

  /**
   * Deep-copies a template into a brand new trip owned by the current
   * user (title, dates, budget, days, and activities), stamped with
   * `cloned_from_template_id` for provenance. The template row itself is
   * only ever read here, never modified — other users can still browse
   * and clone the exact same template afterward.
   */
  cloneTemplateIntoTrip(id: string): Promise<Result<Trip>>;
}
