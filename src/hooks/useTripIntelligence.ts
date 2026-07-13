import { useEffect, useState } from 'react';
import type { Trip, TripIntelligence } from '../types';
import { supabase } from '../lib/supabase';

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

/**
 * Shared AI trip-intelligence data (flight estimate, hotel/restaurant
 * suggestions, packing checklist) — fetched once per trip version and
 * cached in sessionStorage, so the Flights/Hotels/Packing sections can each
 * read the same result independently instead of each firing their own call.
 */
export function useTripIntelligence(trip: Trip) {
  const [data, setData] = useState<TripIntelligence | null>(() => loadCached(trip));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return { data, loading, error, reload: load };
}
