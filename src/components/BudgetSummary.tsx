import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Trip } from '../types';
import { getTripTotal, getRemainingBudget, isOverBudget, getBudgetPercent } from '../utils/budget';

interface BudgetSummaryProps {
  trip: Trip;
}

export default function BudgetSummary({ trip }: BudgetSummaryProps) {
  const total = getTripTotal(trip);
  const remaining = getRemainingBudget(trip);
  const over = isOverBudget(trip);
  const pct = getBudgetPercent(trip);

  return (
    <div className={`card p-5 ${over ? 'border-rose-200' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${over ? 'bg-rose-100 text-rose-600' : 'bg-brand-50 text-brand-600'}`}>
          {over ? <AlertTriangle size={18} /> : <Wallet size={18} />}
        </div>
        <div>
          <h3 className="font-display text-base font-700 text-ink-900">Budget</h3>
          <p className="text-xs text-ink-400">{trip.currency} · {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</p>
        </div>
      </div>

      {over && (
        <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={13} className="text-rose-600 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-700 font-medium leading-relaxed">
            This itinerary exceeds the trip budget by {trip.currency} {Math.abs(remaining).toLocaleString()}.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Budget</span>
          <span className="font-700 text-ink-900">{trip.currency} {trip.budget.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-500">Estimated total</span>
          <span className="font-700 text-ink-900">{trip.currency} {total.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-ink-100">
          <span className="text-ink-500">{over ? 'Over budget by' : 'Remaining budget'}</span>
          <span className={`font-700 ${over ? 'text-rose-600' : 'text-brand-600'}`}>
            {trip.currency} {Math.abs(remaining).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-rose-500' : 'bg-brand-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-ink-400">{pct}% of budget</span>
          <span className={`flex items-center gap-1 font-medium ${over ? 'text-rose-600' : 'text-brand-600'}`}>
            {over ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {over ? 'Over budget' : 'On track'}
          </span>
        </div>
      </div>
    </div>
  );
}
