import { ExternalLink, Plane } from 'lucide-react';
import type { Trip } from '../../types';
import { useTripIntelligence } from '../../hooks/useTripIntelligence';

function googleFlightsUrl(trip: Trip): string {
  const query = `Flights to ${trip.destination} from ${trip.startDate} to ${trip.endDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export default function FlightsSection({ trip }: { trip: Trip }) {
  const { data, loading } = useTripIntelligence(trip);

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
            <Plane size={18} />
          </div>
          <div>
            <h2 className="font-display text-lg font-700 text-ink-900">Flights</h2>
            <p className="text-xs text-ink-600">Estimated pricing and a shortcut to search</p>
          </div>
        </div>

        {data?.estimatedFlightPrice != null ? (
          <p className="text-sm text-ink-700">
            Estimated round-trip: <span className="font-700 text-base">{trip.currency} {Math.round(data.estimatedFlightPrice).toLocaleString()}</span>
            <span className="block text-xs text-ink-500 mt-1">AI estimate based on typical fares for this route — not a live quote.</span>
          </p>
        ) : loading ? (
          <div className="skeleton h-5 w-48" />
        ) : (
          <p className="text-sm text-ink-600">No estimate yet.</p>
        )}

        <a
          href={googleFlightsUrl(trip)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm mt-5 w-full sm:w-auto justify-center"
        >
          Search on Google Flights <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
