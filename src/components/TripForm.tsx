import { useState } from 'react';
import { PACES, INTERESTS, CURRENCIES } from '../lib/mockData';
import type { Interest, TravelPace } from '../types';

export interface TripFormValues {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: TravelPace;
  interests: Interest[];
  specialRequests: string;
}

interface TripFormProps {
  onSubmit: (values: TripFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export default function TripForm({ onSubmit, onCancel, submitLabel = 'Generate Itinerary' }: TripFormProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [travelers, setTravelers] = useState('2');
  const [pace, setPace] = useState<TravelPace>('Balanced');
  const [interests, setInterests] = useState<Interest[]>([]);
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const toggleInterest = (i: Interest) => {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !destination.trim() || !startDate || !endDate) return;

    // Trip length must be greater than 0 days — no upper bound.
    if (endDate < startDate) {
      setDateError('Trip length must be greater than 0 days.');
      return;
    }
    setDateError(null);

    setSubmitting(true);
    onSubmit({
      destination: destination.trim(),
      startDate,
      endDate,
      budget: Number(budget) || 0,
      currency,
      travelers: Number(travelers) || 1,
      pace,
      interests,
      specialRequests: specialRequests.trim(),
    });
  };

  const inputCls = 'input';
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="destination" className="label">Destination</label>
        <input id="destination" className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Tokyo, Japan" required autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="label">Start date</label>
          <input id="startDate" type="date" className={inputCls} value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="endDate" className="label">End date</label>
          <input id="endDate" type="date" className={inputCls} value={endDate} min={startDate || today} onChange={(e) => { setEndDate(e.target.value); setDateError(null); }} required />
        </div>
      </div>

      {dateError && (
        <p className="text-xs text-rose-700 dark:text-rose-400 -mt-4">{dateError}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="budget" className="label">Budget</label>
          <input id="budget" type="number" min="0" className={inputCls} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="2400" required />
        </div>
        <div>
          <label htmlFor="currency" className="label">Currency</label>
          <select id="currency" className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="travelers" className="label">Number of travelers</label>
        <input id="travelers" type="number" min="1" max="20" className={inputCls} value={travelers} onChange={(e) => setTravelers(e.target.value)} required />
      </div>

      <div>
        <span className="label">Travel pace</span>
        <div className="flex flex-wrap gap-2">
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(p)}
              className={`chip border px-4 py-2 text-sm font-semibold transition ${
                pace === p
                  ? 'bg-brand-500 text-black border-brand-500'
                  : 'bg-ink-200/40 text-ink-600 border-glass/10 hover:bg-ink-300/60'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Interests</span>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const active = interests.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`chip border transition ${
                  active
                    ? 'bg-brand-500 text-black border-brand-500'
                    : 'bg-ink-200/40 text-ink-600 border-glass/10 hover:bg-ink-300/60'
                }`}
              >
                {i}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="specialRequests" className="label">Special requests</label>
        <textarea id="specialRequests" className="input min-h-[80px] resize-none" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="e.g. Vegetarian meals, avoid early mornings" />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>{submitLabel}</button>
      </div>
    </form>
  );
}
