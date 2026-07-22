import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import type { Screen } from '../types';
import type { TripTemplateSummary } from '../data';
import { templateRepository } from '../data';
import DestinationPlanCard from '../components/DestinationPlanCard';
import EmptyState from '../components/EmptyState';

interface BrowseTemplatesProps {
  onNavigate: (screen: Screen) => void;
}

/**
 * A random sample of approved suggested trip plans. Re-fetches (and
 * reshuffles) on every mount, so each visit shows a different slice/order
 * of the shared pool rather than a sticky list. Same DestinationPlanCard
 * used by the landing page's destination showcase — one consistent card
 * style everywhere suggested plans show up, not a separate text-box
 * treatment just for this page.
 */
export default function BrowseTemplates({ onNavigate }: BrowseTemplatesProps) {
  const [templates, setTemplates] = useState<TripTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    templateRepository.listApprovedTemplates().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTemplates(result.data);
      } else {
        setLoadError('Could not load suggested trip plans. Please try again.');
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl font-700 text-ink-900">Suggested trip plans</h1>
        <p className="text-ink-600 mt-0.5 text-sm">
          Browse a curated itinerary and make it yours — editing anything copies it into your own My Trips.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton aspect-[4/5] rounded-card-lg" />
          ))}
        </div>
      )}

      {!isLoading && loadError && (
        <div className="card p-8 text-center" role="alert">
          <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{loadError}</p>
        </div>
      )}

      {!isLoading && !loadError && templates.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<Compass size={22} />}
            title="No suggested plans yet"
            description="We're still building this list — check back soon, or start a custom plan of your own."
          />
        </div>
      )}

      {!isLoading && !loadError && templates.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {templates.map((t) => (
            <DestinationPlanCard
              key={t.id}
              name={t.destination.split(',')[0].trim()}
              region={t.country}
              description={t.summary}
              photoQuery={t.destination}
              onClick={() => onNavigate({ name: 'template', templateId: t.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
