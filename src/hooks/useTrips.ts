import { useState, useCallback, useEffect } from 'react';
import type { Trip, TripStatus, User } from '../types';
import { tripRepository, profileRepository } from '../data';
import { deriveTripPreferenceTags, daysBetween } from '../lib/tripPreferences';

export function useTrips(user?: User | null) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Internal helpers ────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (user === null) {
      setTrips([]);
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    const result = await tripRepository.listTrips();
    if (result.ok) {
      setTrips(result.data);
    } else {
      setLoadError('Could not load your trips. Please try again.');
    }
    setIsLoading(false);
  }, [user]);

  // Load on mount and whenever auth state changes
  useEffect(() => { void refresh(); }, [refresh]);

  // ── Trip list mutations ─────────────────────────────────────────────────

  /** Updates top-level trip fields (title, budget, currency, status). Refreshes the list. */
  const updateTripFields = useCallback(async (
    id: string,
    fields: { title?: string; budget?: number; currency?: string; status?: TripStatus },
  ): Promise<void> => {
    const result = await tripRepository.updateTrip(id, fields);
    if (!result.ok) throw new Error(result.error.message);
    await refresh();

    // "finished editing a trip" — a budget change is the only preference-
    // bearing signal this edit surface can produce (pace/travelers aren't
    // editable post-creation), so nudge just the budget tier. Best-effort:
    // never lets a profile-write hiccup surface as a failed trip edit, and
    // demo accounts have no profiles row to begin with.
    if (fields.budget !== undefined && user && !user.isDemo) {
      const trip = result.data;
      const tags = deriveTripPreferenceTags({
        budget: trip.budget,
        travelers: trip.travelers,
        days: daysBetween(trip.startDate, trip.endDate),
      });
      void profileRepository.updatePreferences(user.id, tags).then((r) => {
        if (!r.ok) console.warn('Preference update failed:', r.error.message);
      });
    }
  }, [refresh, user]);

  const duplicateTrip = useCallback(async (id: string): Promise<void> => {
    const result = await tripRepository.duplicateTrip(id);
    if (!result.ok) throw new Error(result.error.message);
    await refresh();
  }, [refresh]);

  const deleteTrip = useCallback(async (id: string): Promise<void> => {
    const result = await tripRepository.deleteTrip(id);
    if (!result.ok) throw new Error(result.error.message);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getTripById = useCallback(
    (id: string): Trip | undefined => trips.find((t) => t.id === id),
    [trips],
  );

  return {
    trips,
    isLoading,
    loadError,
    retryLoad: refresh,
    updateTripFields,
    duplicateTrip,
    deleteTrip,
    getTripById,
  };
}
