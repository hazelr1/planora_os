import { useState, useCallback, useEffect } from 'react';
import type { Trip, User } from '../types';
import type { TripFormValues } from '../components/TripForm';
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

  const createTrip = useCallback(async (values: TripFormValues): Promise<string | null> => {
    const result = await tripRepository.createTrip({
      destination: values.destination,
      startDate: values.startDate,
      endDate: values.endDate,
      budget: values.budget,
      currency: values.currency,
      travelers: values.travelers,
      pace: values.pace,
      interests: values.interests,
      specialRequests: values.specialRequests,
    });
    if (!result.ok) return null;
    await refresh();
    return result.data.id;
  }, [refresh]);

  /** Updates top-level trip fields (title, budget, currency, status). Refreshes the list. */
  const updateTripFields = useCallback(async (
    id: string,
    fields: { title?: string; budget?: number; currency?: string },
  ): Promise<void> => {
    await tripRepository.updateTrip(id, fields);
    await refresh();
  }, [refresh]);

  const duplicateTrip = useCallback(async (id: string): Promise<void> => {
    await tripRepository.duplicateTrip(id);
    await refresh();
  }, [refresh]);

  const deleteTrip = useCallback(async (id: string): Promise<void> => {
    await tripRepository.deleteTrip(id);
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
    createTrip,
    updateTripFields,
    duplicateTrip,
    deleteTrip,
    getTripById,
  };
}
