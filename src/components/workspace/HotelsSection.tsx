import { Building2, UtensilsCrossed } from 'lucide-react';
import type { Trip } from '../../types';
import { useTripIntelligence } from '../../hooks/useTripIntelligence';

function SkeletonLines() {
  return (
    <div className="space-y-1.5">
      <div className="skeleton h-3.5 w-full" />
      <div className="skeleton h-3.5 w-5/6" />
      <div className="skeleton h-3.5 w-4/6" />
    </div>
  );
}

export default function HotelsSection({ trip }: { trip: Trip }) {
  const { data, loading } = useTripIntelligence(trip);

  return (
    <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <h2 className="font-display text-lg font-700 text-ink-900">Where to stay</h2>
        </div>
        {data?.hotelSuggestions.length ? (
          <ul className="space-y-2">
            {data.hotelSuggestions.map((h, i) => (
              <li key={i} className="text-sm text-ink-700 leading-relaxed">• {h}</li>
            ))}
          </ul>
        ) : loading ? <SkeletonLines /> : (
          <p className="text-sm text-ink-600">No suggestions yet.</p>
        )}
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
            <UtensilsCrossed size={18} />
          </div>
          <h2 className="font-display text-lg font-700 text-ink-900">Where to eat</h2>
        </div>
        {data?.restaurantSuggestions.length ? (
          <ul className="space-y-2">
            {data.restaurantSuggestions.map((r, i) => (
              <li key={i} className="text-sm text-ink-700 leading-relaxed">• {r}</li>
            ))}
          </ul>
        ) : loading ? <SkeletonLines /> : (
          <p className="text-sm text-ink-600">No suggestions yet.</p>
        )}
      </div>

      <p className="sm:col-span-2 text-xs text-ink-500">
        AI suggestions based on your destination and interests — not live availability or pricing.
      </p>
    </div>
  );
}
