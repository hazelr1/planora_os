import { useState } from 'react';
import { Map, Plus } from 'lucide-react';
import type { Screen, Trip } from '../types';
import TripCard from '../components/TripCard';
import ConfirmDialog from '../components/ConfirmDialog';
import TripEditModal from '../components/TripEditModal';
import EmptyState from '../components/EmptyState';

interface MyTripsProps {
  trips: Trip[];
  isLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  onNavigate: (screen: Screen) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTripFields: (id: string, fields: { title?: string; budget?: number; currency?: string }) => Promise<void>;
}

function TripCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-36 bg-ink-100 rounded-t-2xl -mx-5 -mt-5 mb-4" />
      <div className="h-5 w-3/4 bg-ink-100 rounded mb-2" />
      <div className="h-4 w-1/2 bg-ink-100 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-7 w-20 bg-ink-100 rounded-lg" />
        <div className="h-7 w-16 bg-ink-100 rounded-lg" />
      </div>
    </div>
  );
}

export default function MyTrips({
  trips, isLoading, loadError, onRetryLoad,
  onNavigate, onDuplicate, onDelete, onUpdateTripFields,
}: MyTripsProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const tripToDelete = trips.find((t) => t.id === confirmDeleteId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-800 text-ink-900">My Trips</h1>
          <p className="text-ink-500 mt-1 text-sm">
            {isLoading ? 'Loading…' : trips.length === 0 ? 'No trips yet' : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`}
          </p>
        </div>
        <button onClick={() => onNavigate({ name: 'create' })} className="btn-primary">
          <Plus size={15} /> New Trip
        </button>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      )}

      {/* Load error */}
      {!isLoading && loadError && (
        <div className="card p-8 text-center">
          <p className="text-sm font-medium text-rose-700 mb-1">{loadError}</p>
          <button onClick={onRetryLoad} className="btn-primary mt-4">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && trips.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<Map size={24} />}
            title="No trips yet"
            description="Create your first trip to start building an itinerary."
            action={
              <button onClick={() => onNavigate({ name: 'create' })} className="btn-primary">
                <Plus size={15} /> Create a trip
              </button>
            }
          />
        </div>
      )}

      {/* Trip grid */}
      {!isLoading && !loadError && trips.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onOpen={() => onNavigate({ name: 'workspace', tripId: trip.id })}
              onEdit={() => setEditingTrip(trip)}
              onDuplicate={() => onDuplicate(trip.id)}
              onDelete={() => setConfirmDeleteId(trip.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete trip?"
        message={
          tripToDelete
            ? `"${tripToDelete.title}" will be permanently removed. This cannot be undone.`
            : 'This trip will be permanently removed.'
        }
        confirmLabel="Delete trip"
        destructive
        onConfirm={() => { if (confirmDeleteId) onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {editingTrip && (
        <TripEditModal
          trip={editingTrip}
          onSave={(title, budget, currency) => {
            void onUpdateTripFields(editingTrip.id, { title, budget, currency });
            setEditingTrip(null);
          }}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </div>
  );
}
