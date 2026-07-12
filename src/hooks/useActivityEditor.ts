import { useCallback } from 'react';
import type { Activity, Trip } from '../types';
import { activityRepository, tripRepository } from '../data';
import type { ActivityInput } from '../data';
import { recalculateDaySchedule } from '../utils/schedule';

export type { ActivityInput };

// Re-fetch the full trip from DB and push the update upward
async function reload(tripId: string, setTrip: (t: Trip) => void): Promise<void> {
  const result = await tripRepository.getTripWithDetails(tripId);
  if (result.ok) setTrip(result.data);
}

export function useActivityEditor(
  trip: Trip,
  setTrip: (t: Trip) => void,
  track: (action: () => Promise<void>) => Promise<void>,
) {
  // ── Optimistic helper ──────────────────────────────────────────────────
  // Applies a local mutation immediately, then calls the DB. Rolls back on failure.
  const optimistic = useCallback(
    (
      apply: (t: Trip) => Trip,
      repoCall: () => Promise<{ ok: boolean; error?: { message: string } }>,
    ) => {
      const snapshot = trip;
      setTrip(apply(trip));
      void track(async () => {
        const result = await repoCall();
        if (!result.ok) {
          setTrip(snapshot);
          throw new Error(result.error?.message ?? 'Save failed.');
        }
      });
    },
    [trip, setTrip, track],
  );

  // ── Pessimistic helper ─────────────────────────────────────────────────
  // Calls the DB, then reloads the trip to reflect confirmed server state.
  const pessimistic = useCallback(
    (repoCall: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
      void track(async () => {
        const result = await repoCall();
        if (!result.ok) throw new Error(result.error?.message ?? 'Save failed.');
        await reload(trip.id, setTrip);
      });
    },
    [trip.id, setTrip, track],
  );

  // ── Activities ──────────────────────────────────────────────────────────

  /** Pessimistic — needs the server-assigned ID of the new activity. */
  const addActivity = useCallback(
    (dayId: string, input: ActivityInput) => {
      pessimistic(() => activityRepository.createActivity(dayId, trip.id, input));
    },
    [trip.id, pessimistic],
  );

  /** Pessimistic — confirms all changed fields from server. */
  const editActivity = useCallback(
    (activityId: string, input: ActivityInput) => {
      pessimistic(() => activityRepository.updateActivity(activityId, trip.id, input));
    },
    [trip.id, pessimistic],
  );

  /** Optimistic — remove immediately; rollback if delete fails. */
  const deleteActivity = useCallback(
    (activityId: string) => {
      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => ({
            ...d,
            activities: d.activities.filter((a) => a.id !== activityId),
          })),
        }),
        () => activityRepository.deleteActivity(activityId, trip.id),
      );
    },
    [trip.id, optimistic],
  );

  /** Pessimistic — activity moves to a target day list on server. */
  const moveToDay = useCallback(
    (activityId: string, targetDayId: string) => {
      pessimistic(() => activityRepository.moveActivity(activityId, trip.id, targetDayId));
    },
    [trip.id, pessimistic],
  );

  /**
   * Drag-and-drop reorder within a single day. Applies the new order
   * immediately, then automatically recalculates start times for every
   * unlocked activity in the day so the schedule chains sensibly from the
   * day's earliest time — locked activities act as fixed anchors.
   */
  const reorderDay = useCallback(
    (dayId: string, orderedActivityIds: string[]) => {
      const day = trip.days.find((d) => d.id === dayId);
      if (!day) return;

      const byId = new Map(day.activities.map((a) => [a.id, a]));
      const ordered = orderedActivityIds.map((id) => byId.get(id)).filter((a): a is Activity => !!a);
      if (ordered.length !== day.activities.length) return;

      const timeUpdates = recalculateDaySchedule(ordered);
      const timeById = new Map(timeUpdates.map((u) => [u.id, u.time]));
      const rescheduled = ordered.map((a) => (timeById.has(a.id) ? { ...a, time: timeById.get(a.id)! } : a));

      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => (d.id === dayId ? { ...d, activities: rescheduled } : d)),
        }),
        async () => {
          const reorderResult = await activityRepository.reorderDay(dayId, orderedActivityIds);
          if (!reorderResult.ok) return reorderResult;
          for (const update of timeUpdates) {
            const timeResult = await activityRepository.setActivityTime(update.id, trip.id, update.time);
            if (!timeResult.ok) return timeResult;
          }
          return { ok: true as const };
        },
      );
    },
    [trip.id, trip.days, optimistic],
  );

  /** Optimistic — swap positions immediately; rollback on failure. */
  const moveUp = useCallback(
    (activityId: string) => {
      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => {
            const idx = d.activities.findIndex((a) => a.id === activityId);
            if (idx <= 0) return d;
            const acts = [...d.activities];
            [acts[idx - 1], acts[idx]] = [acts[idx], acts[idx - 1]];
            return { ...d, activities: acts };
          }),
        }),
        () => activityRepository.reorderActivity(activityId, trip.id, { direction: 'up' }),
      );
    },
    [trip.id, optimistic],
  );

  /** Optimistic — swap positions immediately; rollback on failure. */
  const moveDown = useCallback(
    (activityId: string) => {
      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => {
            const idx = d.activities.findIndex((a) => a.id === activityId);
            if (idx < 0 || idx >= d.activities.length - 1) return d;
            const acts = [...d.activities];
            [acts[idx], acts[idx + 1]] = [acts[idx + 1], acts[idx]];
            return { ...d, activities: acts };
          }),
        }),
        () => activityRepository.reorderActivity(activityId, trip.id, { direction: 'down' }),
      );
    },
    [trip.id, optimistic],
  );

  /** Optimistic — toggle boolean immediately; rollback on failure. */
  const toggleLock = useCallback(
    (activityId: string) => {
      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => ({
            ...d,
            activities: d.activities.map((a) =>
              a.id === activityId ? { ...a, locked: !a.locked } : a,
            ),
          })),
        }),
        () => activityRepository.toggleActivityLock(activityId, trip.id),
      );
    },
    [trip.id, optimistic],
  );

  // ── Notes ───────────────────────────────────────────────────────────────

  /** Pessimistic — needs server-assigned note ID. */
  const addNote = useCallback(
    (activityId: string, text: string) => {
      pessimistic(() => activityRepository.createNote(activityId, trip.id, text));
    },
    [trip.id, pessimistic],
  );

  /** Pessimistic — confirm server echo before updating UI. */
  const editNote = useCallback(
    (activityId: string, noteId: string, text: string) => {
      pessimistic(() => activityRepository.updateNote(activityId, trip.id, noteId, text));
    },
    [trip.id, pessimistic],
  );

  /** Optimistic — remove note immediately; rollback on failure. */
  const deleteNote = useCallback(
    (activityId: string, noteId: string) => {
      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => ({
            ...d,
            activities: d.activities.map((a) =>
              a.id === activityId
                ? { ...a, notes: a.notes.filter((n) => n.id !== noteId) }
                : a,
            ),
          })),
        }),
        () => activityRepository.deleteNote(activityId, trip.id, noteId),
      );
    },
    [trip.id, optimistic],
  );

  return {
    addActivity,
    editActivity,
    deleteActivity,
    moveToDay,
    reorderDay,
    moveUp,
    moveDown,
    toggleLock,
    addNote,
    editNote,
    deleteNote,
  };
}
