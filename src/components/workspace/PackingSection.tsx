import { useState } from 'react';
import { Loader2, Luggage, RefreshCw } from 'lucide-react';
import type { Trip } from '../../types';
import { useTripIntelligence } from '../../hooks/useTripIntelligence';

export default function PackingSection({ trip }: { trip: Trip }) {
  const { data, loading, error, reload } = useTripIntelligence(trip);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggleChecked = (label: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center">
              <Luggage size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-700 text-ink-900">Packing checklist</h2>
              <p className="text-xs text-ink-600">Generated from your destination, trip length, and activities</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
            className="rounded-lg p-2 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition disabled:opacity-50"
            aria-label="Regenerate packing checklist"
            title="Regenerate"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        {error && <p className="text-sm text-rose-400 mb-3">{error}</p>}

        {data?.packingChecklist.length ? (
          <ul className="space-y-2">
            {data.packingChecklist.map((item) => (
              <li key={item.label}>
                <label className="flex items-center gap-3 text-sm text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked.has(item.label)}
                    onChange={() => toggleChecked(item.label)}
                    className="rounded border-glass/20 bg-ink-200/60 text-brand-500 focus:ring-brand-500/40"
                  />
                  <span className={checked.has(item.label) ? 'line-through text-ink-500' : ''}>{item.label}</span>
                  <span className="text-xs text-ink-500 ml-auto">{item.category}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : loading ? (
          <div className="space-y-2.5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-4" style={{ width: `${88 - i * 6}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-600">No checklist yet.</p>
        )}
      </div>
    </div>
  );
}
