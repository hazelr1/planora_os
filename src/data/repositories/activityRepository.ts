/**
 * activityRepository.ts
 *
 * Manages activity and note CRUD. The in-memory implementation mutates the
 * trips array in the shared MemoryStore.
 *
 * When wired to Supabase, replace InMemoryActivityRepository with a
 * SupabaseActivityRepository that queries `public.activities` and
 * `public.activity_notes`, using the mapper references at the bottom.
 */

import type { Activity, ActivityCategory, Note } from '../../types';
import type { Result } from '../databaseErrors';
import { ok, notFound } from '../databaseErrors';
import { store, generateId } from '../memoryStore';

// ─── Input / output types ─────────────────────────────────────────────────────

export interface ActivityInput {
  title: string;
  description: string;
  time: string;
  location: string;
  /** Duration in minutes */
  duration: number;
  cost: number;
  currency: string;
  category: ActivityCategory;
  aiReason: string;
  /** Optional note text to attach immediately on creation */
  noteText?: string;
}

export interface ReorderInput {
  /** 'up' moves the activity one position earlier in the day; 'down' one later */
  direction: 'up' | 'down';
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IActivityRepository {
  /** Adds a new activity to a specific day. */
  createActivity(dayId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>>;

  /** Updates mutable fields on an existing activity. Locked activities may still be edited. */
  updateActivity(activityId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>>;

  /** Permanently removes an activity. */
  deleteActivity(activityId: string, tripId: string): Promise<Result<void>>;

  /** Moves an activity from its current day to a different day within the same trip. */
  moveActivity(activityId: string, tripId: string, targetDayId: string): Promise<Result<Activity>>;

  /** Shifts an activity one position up or down within its day. */
  reorderActivity(activityId: string, tripId: string, input: ReorderInput): Promise<Result<void>>;

  /** Toggles the locked flag without changing any other field. */
  toggleActivityLock(activityId: string, tripId: string): Promise<Result<Activity>>;

  /** Adds a new note to an activity. */
  createNote(activityId: string, tripId: string, text: string): Promise<Result<Note>>;

  /** Edits the text of an existing note. */
  updateNote(activityId: string, tripId: string, noteId: string, text: string): Promise<Result<Note>>;

  /** Permanently removes a note. */
  deleteNote(activityId: string, tripId: string, noteId: string): Promise<Result<void>>;
}

// ─── In-memory implementation ─────────────────────────────────────────────────

class InMemoryActivityRepository implements IActivityRepository {

  // ── Internal helpers ──────────────────────────────────────────────────────

  private getTripIdx(tripId: string): number {
    return store.trips.findIndex((t) => t.id === tripId);
  }

  private mutateTrip(
    tripId: string,
    fn: (days: typeof store.trips[number]['days']) => typeof store.trips[number]['days'],
  ): boolean {
    const idx = this.getTripIdx(tripId);
    if (idx < 0) return false;
    store.trips[idx] = {
      ...store.trips[idx],
      days: fn(store.trips[idx].days),
      lastUpdated: new Date().toISOString(),
    };
    return true;
  }

  private findActivity(
    tripId: string,
    activityId: string,
  ): { activity: Activity; dayIdx: number; actIdx: number } | null {
    const trip = store.trips.find((t) => t.id === tripId);
    if (!trip) return null;
    for (let di = 0; di < trip.days.length; di++) {
      const ai = trip.days[di].activities.findIndex((a) => a.id === activityId);
      if (ai >= 0) return { activity: trip.days[di].activities[ai], dayIdx: di, actIdx: ai };
    }
    return null;
  }

  // ── Public methods ────────────────────────────────────────────────────────

  async createActivity(dayId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>> {
    const tripIdx = this.getTripIdx(tripId);
    if (tripIdx < 0) return { ok: false, error: notFound('trip', tripId) };
    const dayIdx = store.trips[tripIdx].days.findIndex((d) => d.id === dayId);
    if (dayIdx < 0) return { ok: false, error: notFound('day', dayId) };

    const notes: Note[] = input.noteText?.trim()
      ? [{ id: generateId(), text: input.noteText.trim(), createdAt: new Date().toISOString() }]
      : [];

    const activity: Activity = {
      id: generateId(),
      dayId,
      tripId,
      title: input.title,
      description: input.description,
      time: input.time,
      location: input.location,
      duration: input.duration,
      cost: input.cost,
      currency: input.currency,
      category: input.category,
      aiReason: input.aiReason || 'Added manually.',
      locked: false,
      notes,
    };

    store.trips[tripIdx].days[dayIdx].activities.push(activity);
    store.trips[tripIdx].lastUpdated = new Date().toISOString();
    return ok(activity);
  }

  async updateActivity(activityId: string, tripId: string, input: ActivityInput): Promise<Result<Activity>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };

    let updated!: Activity;
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({
        ...d,
        activities: d.activities.map((a) => {
          if (a.id !== activityId) return a;
          updated = {
            ...a,
            title: input.title,
            description: input.description,
            time: input.time,
            location: input.location,
            duration: input.duration,
            cost: input.cost,
            currency: input.currency,
            category: input.category,
            aiReason: input.aiReason || a.aiReason,
          };
          return updated;
        }),
      })),
    );
    return ok(updated);
  }

  async deleteActivity(activityId: string, tripId: string): Promise<Result<void>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== activityId) })),
    );
    return ok(undefined);
  }

  async moveActivity(activityId: string, tripId: string, targetDayId: string): Promise<Result<Activity>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    const { activity } = found;

    let movedActivity!: Activity;
    this.mutateTrip(tripId, (days) => {
      // Remove from source day
      const withRemoval = days.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== activityId),
      }));
      // Add to target day
      movedActivity = { ...activity, dayId: targetDayId };
      return withRemoval.map((d) =>
        d.id === targetDayId
          ? { ...d, activities: [...d.activities, movedActivity] }
          : d,
      );
    });
    return ok(movedActivity);
  }

  async reorderActivity(activityId: string, tripId: string, input: ReorderInput): Promise<Result<void>> {
    this.mutateTrip(tripId, (days) =>
      days.map((d) => {
        const idx = d.activities.findIndex((a) => a.id === activityId);
        if (idx < 0) return d;
        const acts = [...d.activities];
        if (input.direction === 'up' && idx > 0) {
          [acts[idx - 1], acts[idx]] = [acts[idx], acts[idx - 1]];
        } else if (input.direction === 'down' && idx < acts.length - 1) {
          [acts[idx], acts[idx + 1]] = [acts[idx + 1], acts[idx]];
        }
        return { ...d, activities: acts };
      }),
    );
    return ok(undefined);
  }

  async toggleActivityLock(activityId: string, tripId: string): Promise<Result<Activity>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    let toggled!: Activity;
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({
        ...d,
        activities: d.activities.map((a) => {
          if (a.id !== activityId) return a;
          toggled = { ...a, locked: !a.locked };
          return toggled;
        }),
      })),
    );
    return ok(toggled);
  }

  async createNote(activityId: string, tripId: string, text: string): Promise<Result<Note>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    const note: Note = { id: generateId(), text: text.trim(), createdAt: new Date().toISOString() };
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({
        ...d,
        activities: d.activities.map((a) =>
          a.id === activityId ? { ...a, notes: [...a.notes, note] } : a,
        ),
      })),
    );
    return ok(note);
  }

  async updateNote(activityId: string, tripId: string, noteId: string, text: string): Promise<Result<Note>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    let updated!: Note;
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({
        ...d,
        activities: d.activities.map((a) =>
          a.id === activityId
            ? {
                ...a,
                notes: a.notes.map((n) => {
                  if (n.id !== noteId) return n;
                  updated = { ...n, text: text.trim() };
                  return updated;
                }),
              }
            : a,
        ),
      })),
    );
    if (!updated) return { ok: false, error: notFound('note', noteId) };
    return ok(updated);
  }

  async deleteNote(activityId: string, tripId: string, noteId: string): Promise<Result<void>> {
    const found = this.findActivity(tripId, activityId);
    if (!found) return { ok: false, error: notFound('activity', activityId) };
    this.mutateTrip(tripId, (days) =>
      days.map((d) => ({
        ...d,
        activities: d.activities.map((a) =>
          a.id === activityId ? { ...a, notes: a.notes.filter((n) => n.id !== noteId) } : a,
        ),
      })),
    );
    return ok(undefined);
  }
}

export const activityRepository: IActivityRepository = new InMemoryActivityRepository();

// ─── Mappers (reference for future Supabase implementation) ───────────────────
//
//   function mapDbActivityToActivity(row: DbActivity, notes: DbActivityNote[]): Activity {
//     return {
//       id: row.id,
//       dayId: row.day_id,
//       tripId: row.trip_id,
//       title: row.title,
//       description: row.description,
//       time: row.time,
//       location: row.location,
//       duration: row.duration,
//       cost: row.cost,
//       currency: row.currency,
//       category: row.category as ActivityCategory,
//       aiReason: row.ai_reason,
//       locked: row.locked,
//       notes: notes
//         .filter((n) => n.activity_id === row.id)
//         .map((n) => ({ id: n.id, text: n.text, createdAt: n.created_at })),
//     };
//   }
