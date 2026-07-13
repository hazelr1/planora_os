import { useState, useCallback, useEffect } from 'react';
import type { Trip, TripStatus, User } from '../types';
import { tripRepository } from '../data';

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
  }, [refresh]);

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
