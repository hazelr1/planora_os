import { supabase } from '../../../lib/supabase';
import type { Trip, Day, Activity, CostConfidence, Note, TravelPace, TripStatus, Interest, ActivityCategory } from '../../../types';
import type { Result } from '../../databaseErrors';
import { ok, notFound, internal, validationError } from '../../databaseErrors';
import type { ITripRepository, CreateTripInput, UpdateTripInput } from '../tripRepository';

// ─── DB row shapes (actual column names) ─────────────────────────────────────

interface DbTrip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: string;
  interests: string[];
  special_requests: string;
  status: string;
  last_updated: string;
  created_at: string;
  is_demo: boolean;
}

interface DbTripDay {
  id: string;
  trip_id: string;
  label: string;
  date: string;
  theme: string;
  summary: string;
  sort_order: number;
}

interface DbActivity {
  id: string;
  trip_day_id: string;
  trip_id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  duration_minutes: number;
  estimated_cost: number;
  currency: string;
  category: string;
  ai_reason: string;
  is_locked: boolean;
  personal_note: string;
  sort_order: number;
  latitude: number | null;
  longitude: number | null;
  cost_confidence: CostConfidence;
  updated_at: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function parseNotes(raw: string): Note[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapActivity(row: DbActivity): Activity {
  return {
    id: row.id,
    dayId: row.trip_day_id,
    tripId: row.trip_id,
    title: row.title,
    description: row.description,
    time: row.time,
    location: row.location,
    duration: row.duration_minutes,
    cost: Number(row.estimated_cost),
    currency: row.currency,
    category: row.category as ActivityCategory,
    aiReason: row.ai_reason,
    locked: row.is_locked,
    notes: parseNotes(row.personal_note),
    latitude: row.latitude,
    longitude: row.longitude,
    costConfidence: row.cost_confidence,
    updatedAt: row.updated_at,
  };
}

function mapDay(row: DbTripDay, activities: Activity[]): Day {
  return {
    id: row.id,
    tripId: row.trip_id,
    label: row.label,
    date: row.date,
    theme: row.theme,
    summary: row.summary,
    activities,
  };
}

function mapTrip(row: DbTrip, days: Day[]): Trip {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: Number(row.budget),
    currency: row.currency,
    travelers: row.travelers,
    pace: row.pace as TravelPace,
    interests: row.interests as Interest[],
    specialRequests: row.special_requests,
    status: row.status as TripStatus,
    lastUpdated: row.last_updated,
    isDemo: row.is_demo ?? false,
    days,
  };
}

// ─── Helper: fetch days + activities for a trip ───────────────────────────────

async function fetchTripDetails(tripId: string): Promise<Day[]> {
  const { data: dayRows, error: dayErr } = await supabase
    .from('trip_days')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (dayErr || !dayRows) return [];

  const { data: actRows, error: actErr } = await supabase
    .from('activities')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true });
  if (actErr || !actRows) {
    return (dayRows as DbTripDay[]).map((d) => mapDay(d, []));
  }

  const activitiesByDay = new Map<string, Activity[]>();
  for (const row of actRows as DbActivity[]) {
    const dayId = row.trip_day_id;
    if (!activitiesByDay.has(dayId)) activitiesByDay.set(dayId, []);
    activitiesByDay.get(dayId)!.push(mapActivity(row));
  }

  return (dayRows as DbTripDay[]).map((d) =>
    mapDay(d, activitiesByDay.get(d.id) ?? []),
  );
}

// ─── Helper: build day insert rows from date range ────────────────────────────

function buildDayInserts(tripId: string, startDate: string, endDate: string): Omit<DbTripDay, 'id'>[] {
  const rows: Omit<DbTripDay, 'id'>[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const cursor = new Date(start);
  let n = 1;
  while (cursor <= end) {
    rows.push({
      trip_id: tripId,
      label: `Day ${n}`,
      date: cursor.toISOString().slice(0, 10),
      theme: '',
      summary: '',
      sort_order: n,
    });
    cursor.setDate(cursor.getDate() + 1);
    n++;
  }
  return rows;
}

// ─── Implementation ───────────────────────────────────────────────────────────

class SupabaseTripRepository implements ITripRepository {
  async listTrips(): Promise<Result<Trip[]>> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('last_updated', { ascending: false });
    if (error) return { ok: false, error: internal(error.message) };
    const trips = (data as DbTrip[]).map((row) => mapTrip(row, []));
    return ok(trips);
  }

  async getTripWithDetails(id: string): Promise<Result<Trip>> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('trip', id) };
    const days = await fetchTripDetails(id);
    return ok(mapTrip(data as DbTrip, days));
  }

  async createTrip(input: CreateTripInput): Promise<Result<Trip>> {
    // Trip length must be greater than 0 days — no upper bound.
    if (input.endDate < input.startDate) {
      return { ok: false, error: validationError('Trip length must be greater than 0 days.', 'trip') };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('trips')
      .insert({
        title: (input.title?.trim() || input.destination).trim(),
        destination: input.destination,
        start_date: input.startDate,
        end_date: input.endDate,
        budget: input.budget,
        currency: input.currency,
        travelers: input.travelers,
        pace: input.pace,
        interests: input.interests,
        special_requests: input.specialRequests,
        status: 'Planning',
        last_updated: now,
      })
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: internal('Trip insert returned no data.') };

    const tripRow = data as DbTrip;
    const dayInserts = buildDayInserts(tripRow.id, input.startDate, input.endDate);
    if (dayInserts.length > 0) {
      await supabase.from('trip_days').insert(dayInserts);
    }

    const days = await fetchTripDetails(tripRow.id);
    return ok(mapTrip(tripRow, days));
  }

  async updateTrip(id: string, updates: UpdateTripInput): Promise<Result<Trip>> {
    const patch: Record<string, unknown> = { last_updated: new Date().toISOString() };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.budget !== undefined) patch.budget = updates.budget;
    if (updates.currency !== undefined) patch.currency = updates.currency;
    if (updates.status !== undefined) patch.status = updates.status;

    const { data, error } = await supabase
      .from('trips')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('trip', id) };

    const days = await fetchTripDetails(id);
    return ok(mapTrip(data as DbTrip, days));
  }

  async saveTrip(trip: Trip): Promise<Result<Trip>> {
    // Update day themes/summaries and bubble up to the DB
    const now = new Date().toISOString();
    const { error: tripErr } = await supabase
      .from('trips')
      .update({ last_updated: now })
      .eq('id', trip.id);
    if (tripErr) return { ok: false, error: internal(tripErr.message) };

    // Sync day theme/summary changes
    for (const day of trip.days) {
      await supabase
        .from('trip_days')
        .update({ theme: day.theme, summary: day.summary })
        .eq('id', day.id);
    }

    return this.getTripWithDetails(trip.id);
  }

  async deleteTrip(id: string): Promise<Result<void>> {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(undefined);
  }

  async duplicateTrip(id: string): Promise<Result<Trip>> {
    const source = await this.getTripWithDetails(id);
    if (!source.ok) return source;

    const original = source.data;
    const now = new Date().toISOString();

    const { data: newTripData, error: tripErr } = await supabase
      .from('trips')
      .insert({
        title: `${original.title} (Copy)`,
        destination: original.destination,
        start_date: original.startDate,
        end_date: original.endDate,
        budget: original.budget,
        currency: original.currency,
        travelers: original.travelers,
        pace: original.pace,
        interests: original.interests,
        special_requests: original.specialRequests,
        status: 'Planning',
        last_updated: now,
      })
      .select()
      .maybeSingle();
    if (tripErr || !newTripData) return { ok: false, error: internal(tripErr?.message ?? 'Duplicate failed.') };

    const newTripId = (newTripData as DbTrip).id;

    for (let i = 0; i < original.days.length; i++) {
      const day = original.days[i];
      const { data: newDayData } = await supabase
        .from('trip_days')
        .insert({
          trip_id: newTripId,
          label: day.label,
          date: day.date,
          theme: day.theme,
          summary: day.summary,
          sort_order: i + 1,
        })
        .select()
        .maybeSingle();
      if (!newDayData) continue;

      const newDayId = (newDayData as DbTripDay).id;
      for (let j = 0; j < day.activities.length; j++) {
        const act = day.activities[j];
        await supabase.from('activities').insert({
          trip_day_id: newDayId,
          trip_id: newTripId,
          title: act.title,
          description: act.description,
          time: act.time,
          location: act.location,
          duration_minutes: act.duration,
          estimated_cost: act.cost,
          currency: act.currency,
          category: act.category,
          ai_reason: act.aiReason,
          is_locked: act.locked,
          personal_note: JSON.stringify(act.notes),
          sort_order: j,
          latitude: act.latitude,
          longitude: act.longitude,
          cost_confidence: act.costConfidence,
        });
      }
    }

    return this.getTripWithDetails(newTripId);
  }

  async createTripDays(tripId: string): Promise<Result<Day[]>> {
    const trip = await this.getTripWithDetails(tripId);
    if (!trip.ok) return { ok: false, error: trip.error };
    if (trip.data.days.length > 0) return ok(trip.data.days);

    const inserts = buildDayInserts(tripId, trip.data.startDate, trip.data.endDate);
    await supabase.from('trip_days').insert(inserts);
    const days = await fetchTripDetails(tripId);
    return ok(days);
  }
}

export const supabaseTripRepository: ITripRepository = new SupabaseTripRepository();
