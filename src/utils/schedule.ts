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

/**
 * Returns the IDs of activities whose scheduled time overlaps a neighboring
 * activity on the same day (i.e. one starts before the previous one ends).
 * Input order doesn't matter — activities are sorted by time internally.
 */
export function detectConflicts(activities: Activity[]): Set<string> {
  const conflicts = new Set<string>();
  const sorted = [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const current = sorted[i];
    const prevEnd = timeToMinutes(prev.time) + prev.duration;
    if (timeToMinutes(current.time) < prevEnd) {
      conflicts.add(prev.id);
      conflicts.add(current.id);
    }
  }

  return conflicts;
}

const WALKING_SPEED_KMH = 4.5;
const TRANSIT_SPEED_KMH = 25;
const WALK_VS_TRANSIT_THRESHOLD_KM = 1.5;

/** Great-circle distance in kilometers between two coordinates. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Best-effort estimated travel time (minutes) between two activities, based
 * on straight-line distance between their coordinates — not a real routing
 * API, so it's always presented to the user as an estimate. Returns null
 * when either activity is missing coordinates.
 */
export function estimateTravelMinutes(a: Activity, b: Activity): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null;
  const km = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  const speed = km <= WALK_VS_TRANSIT_THRESHOLD_KM ? WALKING_SPEED_KMH : TRANSIT_SPEED_KMH;
  return Math.max(1, Math.round((km / speed) * 60));
}

/**
 * Total estimated travel time across a day's activities in time order.
 * `segments` counts how many gaps could be estimated vs. how many are
 * missing coordinates, so callers can caveat a partial estimate.
 */
export function estimateDayTravelMinutes(activities: Activity[]): {
  totalMinutes: number;
  estimatedSegments: number;
  missingSegments: number;
} {
  const sorted = [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  let totalMinutes = 0;
  let estimatedSegments = 0;
  let missingSegments = 0;

  for (let i = 1; i < sorted.length; i++) {
    const minutes = estimateTravelMinutes(sorted[i - 1], sorted[i]);
    if (minutes == null) {
      missingSegments++;
    } else {
      totalMinutes += minutes;
      estimatedSegments++;
    }
  }

  return { totalMinutes, estimatedSegments, missingSegments };
}
