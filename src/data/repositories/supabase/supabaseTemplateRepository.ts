import { supabase } from '../../../lib/supabase';
import type { Trip, Day, Activity, Interest, TravelPace, ActivityCategory, CostConfidence } from '../../../types';
import type { Result } from '../../databaseErrors';
import { ok, notFound, internal } from '../../databaseErrors';
import type { ITemplateRepository, TripTemplateSummary } from '../templateRepository';
import { supabaseTripRepository } from './supabaseTripRepository';

// ─── DB row shapes (actual column names) ─────────────────────────────────────

interface DbTemplate {
  id: string;
  title: string;
  destination: string;
  country: string;
  continent: string;
  start_date: string;
  end_date: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: string;
  interests: string[];
  special_requests: string;
  summary: string;
  created_at: string;
}

interface DbTemplateDay {
  id: string;
  template_id: string;
  label: string;
  date: string;
  theme: string;
  summary: string;
  sort_order: number;
}

interface DbTemplateActivity {
  id: string;
  template_day_id: string;
  template_id: string;
  title: string;
  description: string;
  time: string;
  location: string;
  duration_minutes: number;
  estimated_cost: number;
  currency: string;
  category: string;
  ai_reason: string;
  latitude: number | null;
  longitude: number | null;
  cost_confidence: string;
  sort_order: number;
}

// ─── Mappers — template rows into the same Trip/Day/Activity shape the ───────
// Workspace UI already renders, so previewing a template needs no bespoke
// display components. Fields that only make sense for a real, owned trip
// instance (locked, notes, updatedAt) get inert defaults; there is nothing
// for them to reflect until this template has been cloned.

function mapTemplateActivity(row: DbTemplateActivity, templateCreatedAt: string): Activity {
  return {
    id: row.id,
    dayId: row.template_day_id,
    tripId: row.template_id,
    title: row.title,
    description: row.description,
    time: row.time,
    location: row.location,
    duration: row.duration_minutes,
    cost: Number(row.estimated_cost),
    currency: row.currency,
    category: row.category as ActivityCategory,
    aiReason: row.ai_reason,
    locked: false,
    notes: [],
    latitude: row.latitude,
    longitude: row.longitude,
    costConfidence: row.cost_confidence as CostConfidence,
    // No real per-activity edit history exists for a template — the
    // "Updated" line on ActivityCard isn't conditional, so this falls back
    // to when the template itself was authored rather than an empty
    // string (which renders as "Invalid Date").
    updatedAt: templateCreatedAt,
  };
}

function mapTemplateDay(row: DbTemplateDay, activities: Activity[]): Day {
  return {
    id: row.id,
    tripId: row.template_id,
    label: row.label,
    date: row.date,
    theme: row.theme,
    summary: row.summary,
    activities,
  };
}

function mapTemplateToTrip(row: DbTemplate, days: Day[]): Trip {
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
    status: 'Planning',
    lastUpdated: '',
    isDemo: false,
    days,
  };
}

function mapTemplateSummary(row: DbTemplate): TripTemplateSummary {
  return {
    id: row.id,
    title: row.title,
    destination: row.destination,
    country: row.country,
    continent: row.continent,
    startDate: row.start_date,
    endDate: row.end_date,
    budget: Number(row.budget),
    currency: row.currency,
    summary: row.summary,
  };
}

// ─── Implementation ───────────────────────────────────────────────────────────

class SupabaseTemplateRepository implements ITemplateRepository {
  async listApprovedTemplates(limit = 15): Promise<Result<TripTemplateSummary[]>> {
    const { data, error } = await supabase
      .from('trip_templates')
      .select('*')
      .eq('review_status', 'approved');
    if (error) return { ok: false, error: internal(error.message) };

    // Random sample + order, done client-side rather than ORDER BY
    // random() in Postgres — the approved pool is small (tens of rows,
    // not thousands), and supabase-js's query builder has no ORDER BY
    // random() escape hatch short of a raw RPC, which isn't worth
    // standing up for a shuffle this cheap. Every call reshuffles, so
    // repeat visits (and different users) see a different slice/order
    // of the same shared pool.
    const rows = (data as DbTemplate[]).map(mapTemplateSummary);
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }

    // Multiple approved templates often exist for the same destination
    // (different pace/budget/interests variants) — keep only the first
    // (random) one per destination so the grid never shows the same place
    // twice, then slice to the limit.
    const seen = new Set<string>();
    const deduped: TripTemplateSummary[] = [];
    for (const row of rows) {
      if (seen.has(row.destination)) continue;
      seen.add(row.destination);
      deduped.push(row);
    }

    return ok(deduped.slice(0, limit));
  }

  async findApprovedTemplatesByDestinationNames(names: string[]): Promise<Result<TripTemplateSummary[]>> {
    if (names.length === 0) return ok([]);
    const { data, error } = await supabase
      .from('trip_templates')
      .select('*')
      .eq('review_status', 'approved')
      .or(names.map((n) => `destination.ilike.${n}%`).join(','));
    if (error) return { ok: false, error: internal(error.message) };
    return ok((data as DbTemplate[]).map(mapTemplateSummary));
  }

  async getTemplateWithDetails(id: string): Promise<Result<Trip>> {
    const { data, error } = await supabase
      .from('trip_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('trip_template', id) };
    const template = data as DbTemplate;

    const { data: dayRows, error: dayErr } = await supabase
      .from('template_days')
      .select('*')
      .eq('template_id', id)
      .order('sort_order', { ascending: true });
    if (dayErr || !dayRows) return ok(mapTemplateToTrip(template, []));

    const { data: actRows, error: actErr } = await supabase
      .from('template_activities')
      .select('*')
      .eq('template_id', id)
      .order('sort_order', { ascending: true });

    const activitiesByDay = new Map<string, Activity[]>();
    if (!actErr && actRows) {
      for (const row of actRows as DbTemplateActivity[]) {
        const dayId = row.template_day_id;
        if (!activitiesByDay.has(dayId)) activitiesByDay.set(dayId, []);
        activitiesByDay.get(dayId)!.push(mapTemplateActivity(row, template.created_at));
      }
    }

    const days = (dayRows as DbTemplateDay[]).map((d) => mapTemplateDay(d, activitiesByDay.get(d.id) ?? []));
    return ok(mapTemplateToTrip(template, days));
  }

  async cloneTemplateIntoTrip(id: string): Promise<Result<Trip>> {
    const source = await this.getTemplateWithDetails(id);
    if (!source.ok) return source;
    const template = source.data;
    const now = new Date().toISOString();

    // trips' INSERT policy checks user_id = auth.uid(), so it must be set
    // explicitly here — there's no DB-level default and the anon-key
    // client (unlike the generate-itinerary edge function's service-role
    // client) never gets it for free.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: internal('You must be signed in to start this plan.') };

    // Mirrors SupabaseTripRepository.duplicateTrip's deep-copy shape —
    // this is the same "copy an existing itinerary into a new owned trip"
    // operation, just sourced from a template's tables instead of another
    // trip's.
    const { data: newTripData, error: tripErr } = await supabase
      .from('trips')
      .insert({
        user_id: user.id,
        title: template.title,
        destination: template.destination,
        start_date: template.startDate,
        end_date: template.endDate,
        budget: template.budget,
        currency: template.currency,
        travelers: template.travelers,
        pace: template.pace,
        interests: template.interests,
        special_requests: template.specialRequests,
        status: 'Planning',
        last_updated: now,
        cloned_from_template_id: id,
      })
      .select()
      .maybeSingle();
    if (tripErr || !newTripData) {
      return { ok: false, error: internal(tripErr?.message ?? 'Could not start this plan. Please try again.') };
    }

    const newTripId = (newTripData as { id: string }).id;

    for (let i = 0; i < template.days.length; i++) {
      const day = template.days[i];
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

      const newDayId = (newDayData as { id: string }).id;
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
          is_locked: false,
          personal_note: '[]',
          sort_order: j,
          latitude: act.latitude,
          longitude: act.longitude,
          cost_confidence: act.costConfidence,
        });
      }
    }

    return supabaseTripRepository.getTripWithDetails(newTripId);
  }
}

export const supabaseTemplateRepository: ITemplateRepository = new SupabaseTemplateRepository();
