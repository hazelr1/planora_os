/**
 * tripRepository.ts
 *
 * Manages trip and trip-day data. The in-memory implementation stores trips as
 * denormalized objects (trip → days → activities) in the shared MemoryStore.
 *
 * When wired to Supabase, replace InMemoryTripRepository with a
 * SupabaseTripRepository that queries `public.trips` and `public.trip_days`,
 * using the DbTrip / DbTripDay types from databaseTypes.ts and the mapper
 * functions at the bottom of this file.
 */

import type { Day, Interest, Trip, TravelPace, TripStatus } from '../../types';
import type { Result } from '../databaseErrors';
import { ok, notFound, validationError } from '../databaseErrors';
import { store, generateId } from '../memoryStore';

// ─── Input / output types ─────────────────────────────────────────────────────

/**
 * All fields required to create a new trip.
 * Matches TripFormValues from TripForm.tsx — the hook bridges between them.
 */
export interface CreateTripInput {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: TravelPace;
  interests: Interest[];
  specialRequests: string;
  /** Optional custom title; defaults to destination. */
  title?: string;
}

export interface UpdateTripInput {
  title?: string;
  budget?: number;
  currency?: string;
  status?: TripStatus;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface ITripRepository {
  /**
   * Returns all trips (without nested day/activity details).
   * Used for the My Trips list view.
   */
  listTrips(): Promise<Result<Trip[]>>;

  /**
   * Returns a single trip with all days and activities fully populated.
   * Used for the Workspace view.
   */
  getTripWithDetails(id: string): Promise<Result<Trip>>;

  /** Creates a new trip and auto-generates day records for each date in range. */
  createTrip(input: CreateTripInput): Promise<Result<Trip>>;

  /** Updates mutable top-level trip fields (title, budget, currency, status). */
  updateTrip(id: string, updates: UpdateTripInput): Promise<Result<Trip>>;

  /**
   * Persists a full trip object.
   * Used by the activity editor to sync nested activity changes back to the trip.
   */
  saveTrip(trip: Trip): Promise<Result<Trip>>;

  /** Permanently removes a trip and all of its days and activities. */
  deleteTrip(id: string): Promise<Result<void>>;

  /**
   * Creates a deep copy of the trip under a new ID.
   * All nested day and activity IDs are also regenerated.
   */
  duplicateTrip(id: string): Promise<Result<Trip>>;

  /**
   * Generates and stores day records for a trip based on its date range.
   * Called automatically by createTrip; can also be called independently.
   */
  createTripDays(tripId: string): Promise<Result<Day[]>>;
}

// ─── Helper: build day records from a date range ──────────────────────────────

function buildDays(tripId: string, startDate: string, endDate: string): Day[] {
  const days: Day[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const cursor = new Date(start);
  let n = 1;
  while (cursor <= end) {
    days.push({
      id: generateId(),
      tripId,
      label: `Day ${n}`,
      date: cursor.toISOString().slice(0, 10),
      theme: '',
      summary: '',
      activities: [],
    });
    cursor.setDate(cursor.getDate() + 1);
    n++;
  }
  return days;
}

// ─── In-memory implementation ─────────────────────────────────────────────────

class InMemoryTripRepository implements ITripRepository {
  async listTrips(): Promise<Result<Trip[]>> {
    // Return a shallow snapshot; caller must not mutate
    return ok([...store.trips]);
  }

  async getTripWithDetails(id: string): Promise<Result<Trip>> {
    const trip = store.trips.find((t) => t.id === id);
    if (!trip) return { ok: false, error: notFound('trip', id) };
    return ok({ ...trip, days: trip.days.map((d) => ({ ...d, activities: [...d.activities] })) });
  }

  async createTrip(input: CreateTripInput): Promise<Result<Trip>> {
    // Trip length must be greater than 0 days — no upper bound.
    if (input.endDate < input.startDate) {
      return { ok: false, error: validationError('Trip length must be greater than 0 days.', 'trip') };
    }

    const id = generateId();
    const now = new Date().toISOString();
    const days = buildDays(id, input.startDate, input.endDate);
    const trip: Trip = {
      id,
      title: (input.title?.trim() || input.destination).trim(),
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      budget: input.budget,
      currency: input.currency,
      travelers: input.travelers,
      pace: input.pace,
      interests: input.interests,
      specialRequests: input.specialRequests,
      status: 'Planning',
      lastUpdated: now,
      isDemo: false,
      days,
    };
    store.trips = [trip, ...store.trips];
    return ok(trip);
  }

  async updateTrip(id: string, updates: UpdateTripInput): Promise<Result<Trip>> {
    const idx = store.trips.findIndex((t) => t.id === id);
    if (idx < 0) return { ok: false, error: notFound('trip', id) };
    store.trips[idx] = {
      ...store.trips[idx],
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    return ok(store.trips[idx]);
  }

  async saveTrip(trip: Trip): Promise<Result<Trip>> {
    const idx = store.trips.findIndex((t) => t.id === trip.id);
    if (idx < 0) return { ok: false, error: notFound('trip', trip.id) };
    store.trips[idx] = { ...trip, lastUpdated: new Date().toISOString() };
    return ok(store.trips[idx]);
  }

  async deleteTrip(id: string): Promise<Result<void>> {
    const exists = store.trips.some((t) => t.id === id);
    if (!exists) return { ok: false, error: notFound('trip', id) };
    store.trips = store.trips.filter((t) => t.id !== id);
    return ok(undefined);
  }

  async duplicateTrip(id: string): Promise<Result<Trip>> {
    const original = store.trips.find((t) => t.id === id);
    if (!original) return { ok: false, error: notFound('trip', id) };
    const newId = generateId();
    const copy: Trip = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      status: 'Planning',
      lastUpdated: new Date().toISOString(),
      days: original.days.map((d) => {
        const newDayId = generateId();
        return {
          ...d,
          id: newDayId,
          tripId: newId,
          activities: d.activities.map((a) => ({
            ...a,
            id: generateId(),
            dayId: newDayId,
            tripId: newId,
            notes: a.notes.map((n) => ({ ...n, id: generateId() })),
          })),
        };
      }),
    };
    store.trips = [copy, ...store.trips];
    return ok(copy);
  }

  async createTripDays(tripId: string): Promise<Result<Day[]>> {
    const trip = store.trips.find((t) => t.id === tripId);
    if (!trip) return { ok: false, error: notFound('trip', tripId) };
    if (trip.days.length > 0) return ok(trip.days);
    const days = buildDays(tripId, trip.startDate, trip.endDate);
    const idx = store.trips.findIndex((t) => t.id === tripId);
    store.trips[idx] = { ...trip, days };
    return ok(days);
  }
}

export const tripRepository: ITripRepository = new InMemoryTripRepository();

// ─── Mappers (reference for future Supabase implementation) ───────────────────
//
// When building SupabaseTripRepository, use functions like these to convert
// between snake_case DB rows and camelCase app models:
//
//   function mapDbTripToTrip(row: DbTrip): Omit<Trip, 'days'> {
//     return {
//       id: row.id,
//       title: row.title,
//       destination: row.destination,
//       startDate: row.start_date,
//       endDate: row.end_date,
//       budget: row.budget,
//       currency: row.currency,
//       travelers: row.travelers,
//       pace: row.pace as TravelPace,
//       interests: row.interests as Interest[],
//       specialRequests: row.special_requests,
//       status: row.status as TripStatus,
//       lastUpdated: row.last_updated,
//     };
//   }
//
//   function mapTripToDbTrip(trip: Trip, userId: string | null): DbTrip {
//     return {
//       id: trip.id,
//       user_id: userId,
//       title: trip.title,
//       destination: trip.destination,
//       start_date: trip.startDate,
//       end_date: trip.endDate,
//       budget: trip.budget,
//       currency: trip.currency,
//       travelers: trip.travelers,
//       pace: trip.pace,
//       interests: trip.interests,
//       special_requests: trip.specialRequests,
//       status: trip.status,
//       last_updated: trip.lastUpdated,
//       created_at: new Date().toISOString(),
//     };
//   }
