import { useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import type { Trip, TripStatus } from '../../types';
import { CURRENCIES } from '../../lib/mockData';

interface SettingsSectionProps {
  trip: Trip;
  onSave: (fields: { title: string; budget: number; currency: string; status: TripStatus }) => void;
  onRequestResetDemo: () => void;
  resetLoading: boolean;
}

const STATUSES: TripStatus[] = ['Planning', 'Confirmed', 'Completed'];

export default function SettingsSection({ trip, onSave, onRequestResetDemo, resetLoading }: SettingsSectionProps) {
  const [title, setTitle] = useState(trip.title);
  const [budget, setBudget] = useState(String(trip.budget));
  const [currency, setCurrency] = useState(trip.currency);
  const [status, setStatus] = useState<TripStatus>(trip.status);
  const [titleError, setTitleError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setTitleError('Trip name is required.'); return; }
    onSave({ title: title.trim(), budget: Number(budget) || 0, currency, status });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-5">
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <h2 className="font-display text-lg font-700 text-ink-900">Trip settings</h2>

        <div>
          <label htmlFor="settings-title" className="label">Trip name</label>
          <input
            id="settings-title"
            className={`input ${titleError ? 'border-rose-500/40 focus:border-rose-500/60' : ''}`}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
          />
          {titleError && <p className="text-xs text-rose-400 mt-1">{titleError}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-budget" className="label">Budget</label>
            <input
              id="settings-budget"
              type="number"
              min="0"
              className="input"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="settings-currency" className="label">Currency</label>
            <select id="settings-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <span className="label">Status</span>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  status === s
                    ? 'border-brand-500/60 bg-brand-500/15 text-brand-300'
                    : 'border-glass/10 bg-ink-200/40 text-ink-600 hover:bg-ink-300/60'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center">
          {saved ? <><Save size={15} /> Saved</> : 'Save changes'}
        </button>
      </form>

      {trip.isDemo && (
        <div className="card p-6">
          <h3 className="font-display text-base font-700 text-ink-900 mb-1.5">Demo trip</h3>
          <p className="text-sm text-ink-600 mb-4">Restore this trip to its original seeded itinerary, discarding all your edits.</p>
          <button
            type="button"
            onClick={onRequestResetDemo}
            disabled={resetLoading}
            className="btn-outline"
          >
            {resetLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Reset demo trip
          </button>
        </div>
      )}
    </div>
  );
}
