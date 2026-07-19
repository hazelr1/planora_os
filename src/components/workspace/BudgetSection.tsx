import type { ActivityCategory, Trip } from '../../types';
import BudgetSummary from '../BudgetSummary';

const CATEGORY_ORDER: ActivityCategory[] = [
  'Food', 'Culture', 'Nature', 'Adventure', 'History',
  'Shopping', 'Nightlife', 'Transport', 'Accommodation', 'Other',
];

export default function BudgetSection({ trip }: { trip: Trip }) {
  const byDay = trip.days.map((d) => ({
    day: d,
    total: d.activities.reduce((sum, a) => sum + a.cost, 0),
  }));

  const byCategory = new Map<ActivityCategory, number>();
  for (const day of trip.days) {
    for (const a of day.activities) {
      byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + a.cost);
    }
  }
  const categoryTotal = [...byCategory.values()].reduce((s, v) => s + v, 0);

  return (
    <div className="max-w-3xl grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <BudgetSummary trip={trip} />

      <div className="card p-4">
        <h3 className="font-display text-sm font-600 text-ink-900 mb-3">By category</h3>
        {categoryTotal === 0 ? (
          <p className="text-sm text-ink-600">No costs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((cat) => {
              const amount = byCategory.get(cat) ?? 0;
              const pct = Math.round((amount / categoryTotal) * 100);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-600">{cat}</span>
                    <span className="text-ink-800 font-600">{trip.currency} {amount.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-300/60 overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card p-4 lg:col-span-2">
        <h3 className="font-display text-sm font-600 text-ink-900 mb-3">By day</h3>
        <div className="space-y-1.5">
          {byDay.map(({ day, total }) => (
            <div key={day.id} className="flex items-center justify-between text-sm py-1 border-b border-glass/5 last:border-0">
              <span className="text-ink-700">{day.label}{day.theme ? ` — ${day.theme}` : ''}</span>
              <span className="font-600 text-ink-900">{trip.currency} {total.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
