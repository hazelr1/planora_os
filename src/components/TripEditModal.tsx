import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CURRENCIES } from '../lib/mockData';
import type { Trip } from '../types';

interface TripEditModalProps {
  trip: Trip;
  onSave: (title: string, budget: number, currency: string) => void;
  onClose: () => void;
}

export default function TripEditModal({ trip, onSave, onClose }: TripEditModalProps) {
  const [title, setTitle] = useState(trip.title);
  const [budget, setBudget] = useState(String(trip.budget));
  const [currency, setCurrency] = useState(trip.currency);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Trip name is required.');
      return;
    }
    onSave(title.trim(), Number(budget) || 0, currency);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm card overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-ink-100">
          <h2 className="font-display text-lg font-700 text-ink-900">Edit trip</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label htmlFor="trip-title" className="label">Trip name</label>
            <input
              id="trip-title"
              className={`input ${titleError ? 'border-rose-400 focus:border-rose-500' : ''}`}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
              placeholder="e.g. Tokyo in Five"
              autoFocus
              required
            />
            {titleError && <p className="text-xs text-rose-600 mt-1">{titleError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="trip-budget" className="label">Budget</label>
              <input
                id="trip-budget"
                type="number"
                min="0"
                className="input"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="2400"
              />
            </div>
            <div>
              <label htmlFor="trip-currency" className="label">Currency</label>
              <select
                id="trip-currency"
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
