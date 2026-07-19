import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Users, Gauge, Wallet, ListChecks, Sparkles, ArrowRight, FlaskConical,
} from 'lucide-react';
import type { Trip } from '../../types';
import type { WorkspaceSectionId } from './types';
import { getTripTotal, getRemainingBudget, isOverBudget } from '../../utils/budget';
import { formatDateRange } from '../../utils/dates';

interface OverviewSectionProps {
  trip: Trip;
  onNavigate: (section: WorkspaceSectionId) => void;
}

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

// Proactive suggestions and "Potential issues" moved to the Days screen
// (Workspace.tsx) — they're about the itinerary specifically, so they now
// live where the itinerary itself is, rather than only in this at-a-glance
// summary. Same components, same detection logic, no behavior change.
export default function OverviewSection({ trip, onNavigate }: OverviewSectionProps) {
  const totalActivities = trip.days.reduce((n, d) => n + d.activities.length, 0);
  const total = getTripTotal(trip);
  const remaining = getRemainingBudget(trip);
  const over = isOverBudget(trip);

  const today = new Date().toISOString().slice(0, 10);
  const nextDay = trip.days.find((d) => d.date >= today) ?? trip.days[0];
  const nextActivity = nextDay?.activities.slice().sort((a, b) => a.time.localeCompare(b.time))[0];

  // Quick facts read as a quiet meta line now, not a row of four cards
  // competing with the itinerary for attention — same fields, same values,
  // just no longer four separate visual boxes.
  const facts: { label: string; value: string; icon: typeof MapPin }[] = [
    { label: 'Destination', value: trip.destination, icon: MapPin },
    { label: 'Dates', value: formatDateRange(trip.startDate, trip.endDate), icon: Calendar },
    { label: 'Travelers', value: `${trip.travelers} ${trip.travelers === 1 ? 'traveler' : 'travelers'}`, icon: Users },
    { label: 'Pace', value: trip.pace, icon: Gauge },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {trip.isDemo && (
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2.5 py-1 text-xs font-700">
          <FlaskConical size={12} /> Demo Data
        </div>
      )}

      {/* Quick facts — one quiet line, not four cards */}
      <motion.div
        {...cardMotion}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-0.5 text-sm text-ink-600"
      >
        {facts.map(({ label, value, icon: Icon }) => (
          <span key={label} className="flex items-center gap-1.5 min-w-0" title={label}>
            <Icon size={13} className="text-ink-500 shrink-0" />
            <span className="truncate">{value}</span>
          </span>
        ))}
      </motion.div>

      {/* Itinerary — the primary card: bigger, first, and carries "up next"
          directly rather than as a separate competing card. */}
      <motion.button
        {...cardMotion}
        transition={{ delay: 0.05, duration: 0.3 }}
        onClick={() => onNavigate('days')}
        className="card card-interactive p-6 text-left w-full"
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="h-10 w-10 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
            <ListChecks size={19} />
          </div>
          <div>
            <h3 className="font-display text-lg font-700 text-ink-900">Your itinerary</h3>
            <p className="text-xs text-ink-600">{totalActivities} activities across {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}</p>
          </div>
          <ArrowRight size={16} className="text-ink-500 ml-auto shrink-0" />
        </div>

        {nextActivity && nextDay && (
          <div className="mt-4 rounded-xl bg-ink-200/40 px-4 py-3 flex items-center gap-2.5">
            <Sparkles size={14} className="text-violet-600 dark:text-violet-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-ink-600">Up next — {nextDay.label} · {nextActivity.time}</p>
              <p className="text-sm font-600 text-ink-900 truncate">{nextActivity.title}</p>
            </div>
          </div>
        )}
      </motion.button>

      {/* Budget — a smaller, secondary companion, not equal-weight with the itinerary */}
      <motion.button
        {...cardMotion}
        transition={{ delay: 0.1, duration: 0.3 }}
        onClick={() => onNavigate('budget')}
        className={`card card-interactive p-4 text-left w-full flex items-center gap-3 ${over ? 'border-rose-500/25' : ''}`}
      >
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${over ? 'bg-rose-500/15 text-rose-800 dark:text-rose-400' : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'}`}>
          <Wallet size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-700 text-ink-900">{trip.currency} {total.toLocaleString()}</p>
          <p className={`text-xs ${over ? 'text-rose-800 dark:text-rose-400' : 'text-ink-600'}`}>
            {over ? `${trip.currency} ${Math.abs(remaining).toLocaleString()} over budget` : `${trip.currency} ${remaining.toLocaleString()} remaining`}
          </p>
        </div>
        <ArrowRight size={14} className="text-ink-500 shrink-0" />
      </motion.button>

      {trip.specialRequests && (
        <motion.div {...cardMotion} transition={{ delay: 0.15, duration: 0.3 }} className="px-0.5">
          <p className="text-xs font-700 uppercase tracking-wide text-ink-500 mb-1">Special requests</p>
          <p className="text-sm text-ink-600 leading-relaxed">{trip.specialRequests}</p>
        </motion.div>
      )}
    </div>
  );
}
