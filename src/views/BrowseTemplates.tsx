import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import type { Screen } from '../types';
import type { TripTemplateSummary } from '../data';
import { templateRepository } from '../data';
import { CONTINENTS } from '../data/geography';
import TemplateCard from '../components/TemplateCard';
import EmptyState from '../components/EmptyState';

interface BrowseTemplatesProps {
  onNavigate: (screen: Screen) => void;
}

/**
 * Continent -> plan picker. No country step — a continent's pool mixes
 * whatever countries/cities within it have been generated (see
 * src/data/geography.ts for the reference list backing the dropdown,
 * and supabase/functions/generate-trip-template for how the pool gets
 * populated). Each visit — and each continent switch — re-samples a
 * random slice/order from that continent's approved pool, so different
 * users (and repeat visits) don't see the same fixed list.
 */
export default function BrowseTemplates({ onNavigate }: BrowseTemplatesProps) {
  const [continent, setContinent] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TripTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!continent) { setTemplates([]); return; }
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    templateRepository.listTemplatesForContinent(continent).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTemplates(result.data);
      } else {
        setLoadError('Could not load suggested trip plans. Please try again.');
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [continent]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl font-700 text-ink-900">Suggested trip plans</h1>
        <p className="text-ink-600 mt-0.5 text-sm">
          Browse a curated itinerary and make it yours — editing anything copies it into your own My Trips.
        </p>
      </div>

      <div className="max-w-xs">
        <label htmlFor="continent-select" className="label">Continent</label>
        <select
          id="continent-select"
          className="input"
          value={continent ?? ''}
          onChange={(e) => setContinent(e.target.value || null)}
        >
          <option value="">Choose a continent…</option>
          {CONTINENTS.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {continent && (
        <div className="mt-6">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-5">
                  <div className="skeleton h-5 w-2/3 mb-2.5" />
                  <div className="skeleton h-3.5 w-1/2 mb-4" />
                  <div className="skeleton h-3.5 w-full mb-1.5" />
                  <div className="skeleton h-3.5 w-4/5" />
                </div>
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
                title={`No suggested plans yet for ${continent}`}
                description="We're still building this list — check back soon, or start a custom plan of your own."
              />
            </div>
          )}

          {!isLoading && !loadError && templates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  title={t.title}
                  destination={t.destination}
                  country={t.country}
                  continent={t.continent}
                  summary={t.summary}
                  startDate={t.startDate}
                  endDate={t.endDate}
                  onClick={() => onNavigate({ name: 'template', templateId: t.id })}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
