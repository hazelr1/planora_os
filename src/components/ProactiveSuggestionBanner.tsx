import { useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Trip } from '../types';
import { getTripTotal, isOverBudget } from '../utils/budget';

interface Suggestion {
  id: string;
  message: string;
  prompt: string;
}

interface ProactiveSuggestionBannerProps {
  trip: Trip;
  onAskCopilot: (prompt: string) => void;
}

const MAX_ACTIVITIES_PER_DAY = 6;
const MAX_SCHEDULED_MINUTES_PER_DAY = 10 * 60;

/**
 * Computes proactive suggestions from conditions we can actually detect
 * today (budget, schedule density) — the itinerary data already in the DB.
 * Rain-forecast and flight-delay triggers activate once weather/flight data
 * providers are connected; this banner never fabricates those signals.
 */
function computeSuggestions(trip: Trip): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (isOverBudget(trip)) {
    const over = Math.round(getTripTotal(trip) - trip.budget);
    suggestions.push({
      id: 'over-budget',
      message: `Your itinerary is ${trip.currency} ${over.toLocaleString()} over budget. I can suggest lower-cost replacements to bring it back in line.`,
      prompt: 'Suggest lower-cost replacements to bring this trip back under budget, prioritizing unlocked activities.',
    });
  }

  for (const day of trip.days) {
    const totalMinutes = day.activities.reduce((sum, a) => sum + a.duration, 0);
    if (day.activities.length > MAX_ACTIVITIES_PER_DAY || totalMinutes > MAX_SCHEDULED_MINUTES_PER_DAY) {
      suggestions.push({
        id: `packed-${day.id}`,
        message: `${day.label} looks packed (${day.activities.length} activities). I can rebalance it and spread things out more comfortably.`,
        prompt: `${day.label} feels overpacked — rebalance it, moving or removing lower-priority unlocked activities to make the pace more comfortable.`,
      });
      break; // one packed-day suggestion at a time keeps the banner focused
    }
  }

  return suggestions;
}

export default function ProactiveSuggestionBanner({ trip, onAskCopilot }: ProactiveSuggestionBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const suggestions = useMemo(() => computeSuggestions(trip), [trip]);
  const active = suggestions.find((s) => !dismissed.has(s.id));

  if (!active) return null;

  return (
    <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 flex items-start gap-2.5" role="status">
      <Sparkles size={16} className="text-violet-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-violet-100 leading-relaxed">{active.message}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => { onAskCopilot(active.prompt); setDismissed((prev) => new Set(prev).add(active.id)); }}
            className="btn-primary text-xs py-1.5 px-3"
          >
            Review changes
          </button>
          <button
            type="button"
            onClick={() => setDismissed((prev) => new Set(prev).add(active.id))}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            Dismiss
          </button>
        </div>
      </div>
      <button
        onClick={() => setDismissed((prev) => new Set(prev).add(active.id))}
        className="rounded-lg p-1 text-violet-300/60 hover:text-violet-200 hover:bg-white/5 transition shrink-0"
        aria-label="Dismiss suggestion"
      >
        <X size={14} />
      </button>
    </div>
  );
}
