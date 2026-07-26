import { useState } from 'react';
import { Map, Plus, Compass, ClipboardList } from 'lucide-react';
import type { Screen, Trip, TripStatus } from '../types';
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
  onUpdateTripFields: (id: string, fields: { title?: string; budget?: number; currency?: string; status?: TripStatus }) => Promise<void>;
  /** Demo sessions can't generate custom AI trips — steer them to the suggested-plans pool instead. */
  isDemo?: boolean;
}

function TripCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-1.5 -mx-0 -mt-0 rounded-none" />
      <div className="p-5">
        <div className="skeleton h-5 w-3/4 mb-2.5" />
        <div className="skeleton h-3.5 w-1/2 mb-5" />
        <div className="skeleton h-3.5 w-2/3 mb-2" />
        <div className="skeleton h-3.5 w-1/3 mb-5" />
        <div className="flex gap-2">
          <div className="skeleton h-8 flex-1" />
          <div className="skeleton h-8 w-9" />
          <div className="skeleton h-8 w-9" />
        </div>
      </div>
    </div>
  );
}

export default function MyTrips({
  trips, isLoading, loadError, onRetryLoad,
  onNavigate, onDuplicate, onDelete, onUpdateTripFields, isDemo = false,
}: MyTripsProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const tripToDelete = trips.find((t) => t.id === confirmDeleteId);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-700 text-ink-900">My Trips</h1>
          <p className="text-ink-600 mt-0.5 text-sm">
            {isLoading ? 'Loading…' : trips.length === 0 ? 'No trips yet' : `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'}`}
          </p>
        </div>
        {isDemo ? (
          <button onClick={() => onNavigate({ name: 'browse-templates' })} className="btn-primary">
            <Compass size={15} /> Browse suggested plans
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate({ name: 'paste-trip' })} className="btn-ghost">
              <ClipboardList size={15} /> Paste a Trip Idea
            </button>
            <button onClick={() => onNavigate({ name: 'create' })} className="btn-primary">
              <Plus size={15} /> New Trip
            </button>
          </div>
        )}
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TripCardSkeleton />
          <TripCardSkeleton />
          <TripCardSkeleton />
        </div>
      )}

      {/* Load error */}
      {!isLoading && loadError && (
        <div className="card p-8 text-center" role="alert">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300 mb-1">{loadError}</p>
          <p className="text-xs text-ink-600 mt-1">Check your connection and try again.</p>
          <button onClick={onRetryLoad} className="btn-primary mt-4">Retry</button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && trips.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<Map size={24} />}
            title="Your next journey starts here."
            description={isDemo ? 'Demo sessions can browse and clone suggested trip plans.' : 'Create your first itinerary with AI.'}
            action={
              isDemo ? (
                <button onClick={() => onNavigate({ name: 'browse-templates' })} className="btn-primary">
                  <Compass size={15} /> Browse suggested plans
                </button>
              ) : (
                <button onClick={() => onNavigate({ name: 'create' })} className="btn-primary">
                  <Plus size={15} /> Create a trip
                </button>
              )
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
            void onUpdateTripFields(editingTrip.id, { title, budget, currency }).catch(() => {
              alert('Could not save trip changes. Please try again.');
            });
            setEditingTrip(null);
          }}
          onClose={() => setEditingTrip(null)}
        />
      )}
    </div>
  );
}
