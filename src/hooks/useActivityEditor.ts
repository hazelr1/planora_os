import { useCallback } from 'react';
import type { Activity, Trip } from '../types';
import { activityRepository, tripRepository } from '../data';
import type { ActivityInput } from '../data';
import { recalculateDaySchedule, timeToMinutes } from '../utils/schedule';

export type { ActivityInput };

function sortByTime(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

// Re-fetch the full trip from DB, push the update upward, and hand back the
// fresh trip so callers can chain further work (e.g. schedule recalculation)
// off confirmed server state instead of a stale closure.
async function reload(tripId: string, setTrip: (t: Trip) => void): Promise<Trip | null> {
  const result = await tripRepository.getTripWithDetails(tripId);
  if (result.ok) {
    setTrip(result.data);
    return result.data;
  }
  return null;
}

/**
 * Recomputes and persists start times for one day, given already-fresh trip
 * data. Returns the trip with those times applied (or unchanged if nothing
 * needed to shift), so multiple days can be recalculated in sequence.
 */
async function recalcAndPersistDay(trip: Trip, dayId: string, setTrip: (t: Trip) => void): Promise<Trip> {
  const day = trip.days.find((d) => d.id === dayId);
  if (!day) return trip;

  const updates = recalculateDaySchedule(sortByTime(day.activities));
  if (updates.length === 0) return trip;

  for (const u of updates) {
    await activityRepository.setActivityTime(u.id, trip.id, u.time);
  }

  const timeById = new Map(updates.map((u) => [u.id, u.time]));
  const updatedTrip: Trip = {
    ...trip,
    days: trip.days.map((d) =>
      d.id === dayId
        ? { ...d, activities: d.activities.map((a) => (timeById.has(a.id) ? { ...a, time: timeById.get(a.id)! } : a)) }
        : d,
    ),
  };
  setTrip(updatedTrip);
  return updatedTrip;
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
  // Calls the DB, reloads the trip to reflect confirmed server state, then
  // (optionally) recalculates the schedule for whichever day(s) were
  // affected — e.g. adding or editing an activity can shift the rest of
  // that day's timeline.
  const pessimistic = useCallback(
    (
      repoCall: () => Promise<{ ok: boolean; error?: { message: string } }>,
      recalcDayIds?: string | (string | undefined)[],
    ) => {
      void track(async () => {
        const result = await repoCall();
        if (!result.ok) throw new Error(result.error?.message ?? 'Save failed.');
        const freshTrip = await reload(trip.id, setTrip);
        if (!freshTrip || !recalcDayIds) return;

        const ids = [...new Set((Array.isArray(recalcDayIds) ? recalcDayIds : [recalcDayIds]).filter((id): id is string => !!id))];
        let current = freshTrip;
        for (const id of ids) {
          current = await recalcAndPersistDay(current, id, setTrip);
        }
      });
    },
    [trip.id, setTrip, track],
  );

  // ── Activities ──────────────────────────────────────────────────────────

  /** Pessimistic — needs the server-assigned ID of the new activity. Recalculates the day's schedule afterward, since inserting an activity can shift the rest of the day. */
  const addActivity = useCallback(
    (dayId: string, input: ActivityInput) => {
      pessimistic(() => activityRepository.createActivity(dayId, trip.id, input), dayId);
    },
    [trip.id, pessimistic],
  );

  /** Pessimistic — confirms all changed fields from server, then recalculates the day's schedule (time/duration edits can shift later activities). */
  const editActivity = useCallback(
    (activityId: string, input: ActivityInput) => {
      const dayId = trip.days.find((d) => d.activities.some((a) => a.id === activityId))?.id;
      pessimistic(() => activityRepository.updateActivity(activityId, trip.id, input), dayId);
    },
    [trip.id, trip.days, pessimistic],
  );

  /** Optimistic — remove immediately, recalculating the remaining schedule in the same update; rollback both if delete fails. */
  const deleteActivity = useCallback(
    (activityId: string) => {
      const day = trip.days.find((d) => d.activities.some((a) => a.id === activityId));
      if (!day) return;

      const remaining = day.activities.filter((a) => a.id !== activityId);
      const ordered = sortByTime(remaining);
      const timeUpdates = recalculateDaySchedule(ordered);
      const timeById = new Map(timeUpdates.map((u) => [u.id, u.time]));
      const rescheduled = ordered.map((a) => (timeById.has(a.id) ? { ...a, time: timeById.get(a.id)! } : a));

      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => (d.id === day.id ? { ...d, activities: rescheduled } : d)),
        }),
        async () => {
          const delResult = await activityRepository.deleteActivity(activityId, trip.id);
          if (!delResult.ok) return delResult;
          for (const u of timeUpdates) {
            const timeResult = await activityRepository.setActivityTime(u.id, trip.id, u.time);
            if (!timeResult.ok) return timeResult;
          }
          return { ok: true as const };
        },
      );
    },
    [trip.id, trip.days, optimistic],
  );

  /** Pessimistic — activity moves to a target day list on server, then recalculates both the source and destination day's schedules. */
  const moveToDay = useCallback(
    (activityId: string, targetDayId: string) => {
      const sourceDayId = trip.days.find((d) => d.activities.some((a) => a.id === activityId))?.id;
      pessimistic(() => activityRepository.moveActivity(activityId, trip.id, targetDayId), [sourceDayId, targetDayId]);
    },
    [trip.id, trip.days, pessimistic],
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

  /**
   * Optimistic — swap positions immediately; rollback on failure.
   *
   * DaySection/ActivityCard render each day sorted by `time`, not by the
   * activities array's own order (which mirrors DB `sort_order`) — so
   * swapping `sort_order` alone (what reorderActivity does server-side)
   * never changed what the user actually sees, since the visible order is
   * still governed entirely by unchanged `time` values. Drag-and-drop
   * (reorderDay) already recalculates and persists new times after
   * reordering for exactly this reason; these need to do the same, swapping
   * within the time-sorted order rather than the raw array order.
   */
  const swapAdjacent = useCallback(
    (activityId: string, direction: 'up' | 'down') => {
      const day = trip.days.find((d) => d.activities.some((a) => a.id === activityId));
      if (!day) return;

      const sorted = sortByTime(day.activities);
      const idx = sorted.findIndex((a) => a.id === activityId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

      const timeUpdates = recalculateDaySchedule(reordered);
      const timeById = new Map(timeUpdates.map((u) => [u.id, u.time]));
      const rescheduled = reordered.map((a) => (timeById.has(a.id) ? { ...a, time: timeById.get(a.id)! } : a));

      optimistic(
        (t) => ({
          ...t,
          days: t.days.map((d) => (d.id === day.id ? { ...d, activities: rescheduled } : d)),
        }),
        async () => {
          const reorderResult = await activityRepository.reorderActivity(activityId, trip.id, { direction });
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

  const moveUp = useCallback((activityId: string) => swapAdjacent(activityId, 'up'), [swapAdjacent]);
  const moveDown = useCallback((activityId: string) => swapAdjacent(activityId, 'down'), [swapAdjacent]);

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
