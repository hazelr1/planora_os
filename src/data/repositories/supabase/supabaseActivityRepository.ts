import { supabase } from '../../../lib/supabase';
import type { Activity, CostConfidence, Note, ActivityCategory } from '../../../types';
import type { Result } from '../../databaseErrors';
import { ok, notFound, internal } from '../../databaseErrors';
import type { IActivityRepository, ActivityInput, ReorderInput } from '../activityRepository';

// ─── DB row shape ─────────────────────────────────────────────────────────────

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

function mapRow(row: DbActivity): Activity {
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

function generateId(): string {
  return crypto.randomUUID();
}

// ─── Helper: get next sort_order for a day ────────────────────────────────────

async function nextSortOrder(dayId: string): Promise<number> {
  const { data } = await supabase
    .from('activities')
    .select('sort_order')
    .eq('trip_day_id', dayId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? (data as { sort_order: number }).sort_order + 1 : 0;
}

// ─── Helper: fetch activity by ID ────────────────────────────────────────────

async function fetchActivity(activityId: string): Promise<Activity | null> {
  const { data } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .maybeSingle();
  return data ? mapRow(data as DbActivity) : null;
}

// ─── Helper: verify activity belongs to a trip ────────────────────────────────

async function verifyOwnership(activityId: string, tripId: string): Promise<boolean> {
  const { data } = await supabase
    .from('activities')
    .select('id')
    .eq('id', activityId)
    .eq('trip_id', tripId)
    .maybeSingle();
  return !!data;
}

// ─── Implementation ───────────────────────────────────────────────────────────

class SupabaseActivityRepository implements IActivityRepository {
  async createActivity(dayId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>> {
    const sortOrder = await nextSortOrder(dayId);
    const notes: Note[] = input.noteText?.trim()
      ? [{ id: generateId(), text: input.noteText.trim(), createdAt: new Date().toISOString() }]
      : [];

    const { data, error } = await supabase
      .from('activities')
      .insert({
        trip_day_id: dayId,
        trip_id: tripId,
        title: input.title,
        description: input.description,
        time: input.time,
        location: input.location,
        duration_minutes: input.duration,
        estimated_cost: input.cost,
        currency: input.currency,
        category: input.category,
        ai_reason: input.aiReason || 'Added manually.',
        is_locked: false,
        personal_note: JSON.stringify(notes),
        sort_order: sortOrder,
      })
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: internal('Activity insert returned no data.') };
    return ok(mapRow(data as DbActivity));
  }

  async updateActivity(activityId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>> {
    const owned = await verifyOwnership(activityId, tripId);
    if (!owned) return { ok: false, error: notFound('activity', activityId) };

    const { data, error } = await supabase
      .from('activities')
      .update({
        title: input.title,
        description: input.description,
        time: input.time,
        location: input.location,
        duration_minutes: input.duration,
        estimated_cost: input.cost,
        currency: input.currency,
        category: input.category,
        ai_reason: input.aiReason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activityId)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('activity', activityId) };
    return ok(mapRow(data as DbActivity));
  }

  async deleteActivity(activityId: string, tripId: string): Promise<Result<void>> {
    const owned = await verifyOwnership(activityId, tripId);
    if (!owned) return { ok: false, error: notFound('activity', activityId) };

    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(undefined);
  }

  async moveActivity(activityId: string, tripId: string, targetDayId: string): Promise<Result<Activity>> {
    const owned = await verifyOwnership(activityId, tripId);
    if (!owned) return { ok: false, error: notFound('activity', activityId) };

    const sortOrder = await nextSortOrder(targetDayId);
    const { data, error } = await supabase
      .from('activities')
      .update({ trip_day_id: targetDayId, sort_order: sortOrder, updated_at: new Date().toISOString() })
      .eq('id', activityId)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('activity', activityId) };
    return ok(mapRow(data as DbActivity));
  }

  /**
   * Sets the exact sort order for every activity in a day in one batch —
   * used by drag-and-drop, which can drop an activity at any position.
   */
  async reorderDay(dayId: string, orderedActivityIds: string[]): Promise<Result<void>> {
    const now = new Date().toISOString();
    const results = await Promise.all(
      orderedActivityIds.map((id, index) =>
        supabase
          .from('activities')
          .update({ sort_order: index, updated_at: now })
          .eq('id', id)
          .eq('trip_day_id', dayId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) return { ok: false, error: internal(failed.error.message) };
    return ok(undefined);
  }

  /** Used by drag-to-reschedule and automatic schedule recalculation. */
  async setActivityTime(activityId: string, tripId: string, time: string): Promise<Result<void>> {
    const owned = await verifyOwnership(activityId, tripId);
    if (!owned) return { ok: false, error: notFound('activity', activityId) };

    const { error } = await supabase
      .from('activities')
      .update({ time, updated_at: new Date().toISOString() })
      .eq('id', activityId);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(undefined);
  }

  async reorderActivity(activityId: string, tripId: string, input: ReorderInput): Promise<Result<void>> {
    const activity = await fetchActivity(activityId);
    if (!activity || activity.tripId !== tripId) return { ok: false, error: notFound('activity', activityId) };

    const { data: siblings } = await supabase
      .from('activities')
      .select('id, sort_order')
      .eq('trip_day_id', activity.dayId)
      .order('sort_order', { ascending: true });

    if (!siblings || siblings.length < 2) return ok(undefined);

    const idx = (siblings as { id: string; sort_order: number }[]).findIndex((a) => a.id === activityId);
    if (idx < 0) return ok(undefined);

    const swapIdx = input.direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return ok(undefined);

    const current = siblings[idx] as { id: string; sort_order: number };
    const neighbor = siblings[swapIdx] as { id: string; sort_order: number };

    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('activities').update({ sort_order: neighbor.sort_order, updated_at: now }).eq('id', current.id),
      supabase.from('activities').update({ sort_order: current.sort_order, updated_at: now }).eq('id', neighbor.id),
    ]);

    return ok(undefined);
  }

  async toggleActivityLock(activityId: string, tripId: string): Promise<Result<Activity>> {
    const activity = await fetchActivity(activityId);
    if (!activity || activity.tripId !== tripId) return { ok: false, error: notFound('activity', activityId) };

    const { data, error } = await supabase
      .from('activities')
      .update({ is_locked: !activity.locked, updated_at: new Date().toISOString() })
      .eq('id', activityId)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('activity', activityId) };
    return ok(mapRow(data as DbActivity));
  }

  async createNote(activityId: string, tripId: string, text: string): Promise<Result<Note>> {
    const activity = await fetchActivity(activityId);
    if (!activity || activity.tripId !== tripId) return { ok: false, error: notFound('activity', activityId) };

    const newNote: Note = { id: generateId(), text: text.trim(), createdAt: new Date().toISOString() };
    const updatedNotes = [...activity.notes, newNote];

    const { error } = await supabase
      .from('activities')
      .update({ personal_note: JSON.stringify(updatedNotes), updated_at: new Date().toISOString() })
      .eq('id', activityId);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(newNote);
  }

  async updateNote(activityId: string, tripId: string, noteId: string, text: string): Promise<Result<Note>> {
    const activity = await fetchActivity(activityId);
    if (!activity || activity.tripId !== tripId) return { ok: false, error: notFound('activity', activityId) };

    const note = activity.notes.find((n) => n.id === noteId);
    if (!note) return { ok: false, error: notFound('note', noteId) };

    const updated: Note = { ...note, text: text.trim() };
    const updatedNotes = activity.notes.map((n) => (n.id === noteId ? updated : n));

    const { error } = await supabase
      .from('activities')
      .update({ personal_note: JSON.stringify(updatedNotes), updated_at: new Date().toISOString() })
      .eq('id', activityId);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(updated);
  }

  async deleteNote(activityId: string, tripId: string, noteId: string): Promise<Result<void>> {
    const activity = await fetchActivity(activityId);
    if (!activity || activity.tripId !== tripId) return { ok: false, error: notFound('activity', activityId) };

    const updatedNotes = activity.notes.filter((n) => n.id !== noteId);
    const { error } = await supabase
      .from('activities')
      .update({ personal_note: JSON.stringify(updatedNotes), updated_at: new Date().toISOString() })
      .eq('id', activityId);
    if (error) return { ok: false, error: internal(error.message) };
    return ok(undefined);
  }
}

export const supabaseActivityRepository: IActivityRepository = new SupabaseActivityRepository();
