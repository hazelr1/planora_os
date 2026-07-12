import { useEffect, useState } from 'react';
import {
  CloudOff, ExternalLink, Loader2, Luggage, Plane, RefreshCw, Building2, UtensilsCrossed,
} from 'lucide-react';
import type { Trip, TripIntelligence } from '../types';
import { supabase } from '../lib/supabase';
import BudgetSummary from './BudgetSummary';

interface TripIntelligencePanelProps {
  trip: Trip;
}

function cacheKey(trip: Trip): string {
  // Regenerate whenever the itinerary meaningfully changes (activity count or
  // last-updated timestamp), not on every render.
  const activityCount = trip.days.reduce((n, d) => n + d.activities.length, 0);
  return `planora-trip-intel-${trip.id}-${activityCount}-${trip.lastUpdated}`;
}

function loadCached(trip: Trip): TripIntelligence | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(trip));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCached(trip: Trip, data: TripIntelligence): void {
  try {
    sessionStorage.setItem(cacheKey(trip), JSON.stringify(data));
  } catch {
    // ignore — non-critical cache
  }
}

function googleFlightsUrl(trip: Trip): string {
  const query = `Flights to ${trip.destination} from ${trip.startDate} to ${trip.endDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export default function TripIntelligencePanel({ trip }: TripIntelligencePanelProps) {
  const [data, setData] = useState<TripIntelligence | null>(() => loadCached(trip));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expired.'); setLoading(false); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-intelligence`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ trip_id: trip.id }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Could not load trip intelligence.');
        setLoading(false);
        return;
      }

      const result: TripIntelligence = {
        packingChecklist: json.packing_checklist ?? [],
        hotelSuggestions: json.hotel_suggestions ?? [],
        restaurantSuggestions: json.restaurant_suggestions ?? [],
        estimatedFlightPrice: json.estimated_flight_price ?? null,
        generatedAt: json.generated_at,
      };
      setData(result);
      saveCached(trip, result);
    } catch {
      setError('Could not load trip intelligence. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = loadCached(trip);
    if (cached) {
      setData(cached);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey(trip)]);

  const toggleChecked = (label: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <BudgetSummary trip={trip} />

      {/* Weather */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <CloudOff size={16} className="text-ink-500" />
          <h3 className="font-display text-base font-700 text-ink-900">Weather</h3>
        </div>
        <p className="text-xs text-ink-600 leading-relaxed">
          Weather forecasts aren't available yet — connect a weather provider to see daily temperature, rain probability, and sunrise/sunset here.
        </p>
      </div>

      {/* Flights */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Plane size={16} className="text-brand-400" />
          <h3 className="font-display text-base font-700 text-ink-900">Flights</h3>
        </div>
        {data?.estimatedFlightPrice != null ? (
          <p className="text-sm text-ink-700">
            Estimated round-trip: <span className="font-700">{trip.currency} {Math.round(data.estimatedFlightPrice).toLocaleString()}</span>
            <span className="text-xs text-ink-500"> (AI estimate, not a live quote)</span>
          </p>
        ) : loading ? (
          <div className="skeleton h-4 w-40" />
        ) : (
          <p className="text-xs text-ink-600">No estimate yet.</p>
        )}
        <a
          href={googleFlightsUrl(trip)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline text-xs mt-3 w-full justify-center"
        >
          Search on Google Flights <ExternalLink size={12} />
        </a>
      </div>

      {/* Hotels & restaurants */}
      <div className="card p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={16} className="text-brand-400" />
            <h3 className="font-display text-base font-700 text-ink-900">Where to stay</h3>
          </div>
          {data?.hotelSuggestions.length ? (
            <ul className="space-y-1.5">
              {data.hotelSuggestions.map((h, i) => (
                <li key={i} className="text-xs text-ink-700 leading-relaxed">• {h}</li>
              ))}
            </ul>
          ) : loading ? (
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-5/6" />
              <div className="skeleton h-3.5 w-4/6" />
            </div>
          ) : (
            <p className="text-xs text-ink-600">No suggestions yet.</p>
          )}
        </div>
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <UtensilsCrossed size={16} className="text-brand-400" />
            <h3 className="font-display text-base font-700 text-ink-900">Where to eat</h3>
          </div>
          {data?.restaurantSuggestions.length ? (
            <ul className="space-y-1.5">
              {data.restaurantSuggestions.map((r, i) => (
                <li key={i} className="text-xs text-ink-700 leading-relaxed">• {r}</li>
              ))}
            </ul>
          ) : loading ? (
            <div className="space-y-1.5">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-5/6" />
              <div className="skeleton h-3.5 w-4/6" />
            </div>
          ) : (
            <p className="text-xs text-ink-600">No suggestions yet.</p>
          )}
        </div>
        <p className="text-[10px] text-ink-500">AI suggestions based on your destination and interests — not live availability or pricing.</p>
      </div>

      {/* Packing checklist */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Luggage size={16} className="text-brand-400" />
            <h3 className="font-display text-base font-700 text-ink-900">Packing checklist</h3>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-white/5 transition disabled:opacity-50"
            aria-label="Regenerate packing checklist"
            title="Regenerate"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          </button>
        </div>

        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}

        {data?.packingChecklist.length ? (
          <ul className="space-y-1.5">
            {data.packingChecklist.map((item) => (
              <li key={item.label}>
                <label className="flex items-center gap-2.5 text-xs text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked.has(item.label)}
                    onChange={() => toggleChecked(item.label)}
                    className="rounded border-white/20 bg-ink-200/60 text-brand-500 focus:ring-brand-500/40"
                  />
                  <span className={checked.has(item.label) ? 'line-through text-ink-500' : ''}>{item.label}</span>
                  <span className="text-[10px] text-ink-500 ml-auto">{item.category}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-4" style={{ width: `${85 - i * 8}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-600">No checklist yet.</p>
        )}
        <p className="text-[10px] text-ink-500 mt-2">
          Generated from your destination, trip length, and planned activities.
        </p>
      </div>
    </div>
  );
}
