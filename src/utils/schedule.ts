import type { Activity } from '../types';

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const DEFAULT_GAP_MINUTES = 15;
const DEFAULT_DAY_START_MINUTES = 9 * 60;

/**
 * Recomputes start times for a day's activities in their current order.
 *
 * The earliest time already present among the day's activities is treated as
 * the day's anchor start — this keeps recalculation stable across reorders
 * (dragging a different activity to the top doesn't reset the whole day to
 * that activity's old time). Locked activities never move; unlocked
 * activities are chained back-to-back after whichever activity precedes them,
 * skipping forward past any locked activity's end time plus a short buffer.
 *
 * Returns only the activities whose time actually changed.
 */
export function recalculateDaySchedule(
  orderedActivities: Activity[],
  gapMinutes: number = DEFAULT_GAP_MINUTES,
): { id: string; time: string }[] {
  if (orderedActivities.length === 0) return [];

  const existingTimes = orderedActivities
    .map((a) => timeToMinutes(a.time))
    .filter((m) => Number.isFinite(m) && m >= 0);
  let cursor = existingTimes.length > 0 ? Math.min(...existingTimes) : DEFAULT_DAY_START_MINUTES;

  const updates: { id: string; time: string }[] = [];

  for (const activity of orderedActivities) {
    if (activity.locked) {
      const start = timeToMinutes(activity.time);
      cursor = Math.max(cursor, start + activity.duration + gapMinutes);
      continue;
    }

    const newTime = minutesToTime(cursor);
    if (newTime !== activity.time) {
      updates.push({ id: activity.id, time: newTime });
    }
    cursor += activity.duration + gapMinutes;
  }

  return updates;
}
