import type { Trip } from '../types';
import { timeToMinutes, estimateTravelMinutes } from './schedule';
import { getBudgetPercent, isOverBudget } from './budget';

export interface TripIssue {
  id: string;
  message: string;
}

const LONG_WALK_MINUTES = 30;
const LATE_MEAL_MINUTES = 21 * 60; // 9:00 PM
const NEARLY_OVER_BUDGET_PERCENT = 90;
const OUTDOOR_STREAK_THRESHOLD = 3;
const OUTDOOR_CATEGORIES = new Set(['Nature', 'Adventure']);
const MAX_ISSUES = 6;

function isMonday(dateStr: string): boolean {
  return new Date(`${dateStr}T00:00:00`).getDay() === 1;
}

/**
 * Best-effort "things a careful human trip planner would flag" — never a
 * live fact (this app never claims confirmed hours/prices/weather), just
 * heuristics computed from data already on the trip: overlapping times,
 * long walks between back-to-back stops, a budget about to run out, a very
 * late meal, several outdoor activities stacked with no variety, and the
 * common (not universal) rule that many museums close on Mondays. Framed as
 * "worth checking," never as a certainty.
 */
export function detectTripIssues(trip: Trip): TripIssue[] {
  const issues: TripIssue[] = [];

  for (const day of trip.days) {
    const sorted = [...day.activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      const prevEnd = timeToMinutes(prev.time) + prev.duration;

      if (timeToMinutes(current.time) < prevEnd) {
        issues.push({
          id: `conflict-${prev.id}-${current.id}`,
          message: `${day.label}: "${prev.title}" and "${current.title}" overlap in time.`,
        });
        continue;
      }

      const travelMinutes = estimateTravelMinutes(prev, current);
      if (travelMinutes != null && travelMinutes >= LONG_WALK_MINUTES) {
        issues.push({
          id: `walk-${prev.id}-${current.id}`,
          message: `${day.label}: a long walk (~${travelMinutes} min) between "${prev.title}" and "${current.title}".`,
        });
      }
    }

    let outdoorStreak = 0;
    for (const activity of sorted) {
      if (OUTDOOR_CATEGORIES.has(activity.category)) {
        outdoorStreak++;
        if (outdoorStreak === OUTDOOR_STREAK_THRESHOLD) {
          issues.push({
            id: `outdoor-${day.id}`,
            message: `${day.label}: several outdoor activities back to back — worth checking the forecast.`,
          });
        }
      } else {
        outdoorStreak = 0;
      }
    }

    for (const activity of day.activities) {
      if (activity.category === 'Food' && timeToMinutes(activity.time) >= LATE_MEAL_MINUTES) {
        issues.push({
          id: `late-${activity.id}`,
          message: `${day.label}: "${activity.title}" is scheduled quite late (${activity.time}).`,
        });
      }
      if (activity.category === 'Culture' && /museum/i.test(activity.title) && isMonday(day.date)) {
        issues.push({
          id: `monday-${activity.id}`,
          message: `${day.label}: many museums close on Mondays — worth double-checking "${activity.title}" before you go.`,
        });
      }
    }
  }

  if (!isOverBudget(trip) && getBudgetPercent(trip) >= NEARLY_OVER_BUDGET_PERCENT) {
    issues.push({
      id: 'near-budget',
      message: `Your itinerary is at ${getBudgetPercent(trip)}% of budget — not much room left.`,
    });
  }

  return issues.slice(0, MAX_ISSUES);
}
