import type { Trip } from '../types';

export function getTripTotal(trip: Trip): number {
  return trip.days.reduce(
    (sum, day) => sum + day.activities.reduce((s, a) => s + a.cost, 0),
    0,
  );
}

export function getRemainingBudget(trip: Trip): number {
  return trip.budget - getTripTotal(trip);
}

export function isOverBudget(trip: Trip): boolean {
  return getRemainingBudget(trip) < 0;
}

export function getBudgetPercent(trip: Trip): number {
  if (trip.budget <= 0) return 0;
  return Math.min(100, Math.round((getTripTotal(trip) / trip.budget) * 100));
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
