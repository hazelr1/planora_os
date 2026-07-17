import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Calendar, Users, Gauge, Wallet, ListChecks, Sparkles, ArrowRight, FlaskConical, AlertTriangle,
} from 'lucide-react';
import type { Trip } from '../../types';
import type { WorkspaceSectionId } from './types';
import ProactiveSuggestionBanner from '../ProactiveSuggestionBanner';
import { getTripTotal, getRemainingBudget, isOverBudget } from '../../utils/budget';
import { formatDateRange } from '../../utils/dates';
import { detectTripIssues } from '../../utils/insights';

interface OverviewSectionProps {
  trip: Trip;
  onAskCopilot: (prompt: string) => void;
  onNavigate: (section: WorkspaceSectionId) => void;
}

const cardMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export default function OverviewSection({ trip, onAskCopilot, onNavigate }: OverviewSectionProps) {
  const totalActivities = trip.days.reduce((n, d) => n + d.activities.length, 0);
  const total = getTripTotal(trip);
  const remaining = getRemainingBudget(trip);
  const over = isOverBudget(trip);
  const issues = useMemo(() => detectTripIssues(trip), [trip]);

  const today = new Date().toISOString().slice(0, 10);
  const nextDay = trip.days.find((d) => d.date >= today) ?? trip.days[0];
  const nextActivity = nextDay?.activities.slice().sort((a, b) => a.time.localeCompare(b.time))[0];

  const stats: { label: string; value: string; icon: typeof MapPin; section?: WorkspaceSectionId }[] = [
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

      <ProactiveSuggestionBanner trip={trip} onAskCopilot={onAskCopilot} />

      {issues.length > 0 && (
        <motion.div {...cardMotion} transition={{ duration: 0.3 }} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={14} />
            </div>
            <h3 className="font-display text-base font-700 text-ink-900">Potential issues</h3>
          </div>
          <ul className="space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2 text-sm text-ink-700">
                <span className="mt-1.5 h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                <span className="leading-relaxed">{issue.message}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Quick facts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            {...cardMotion}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="card p-4"
          >
            <div className="h-8 w-8 rounded-lg bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-2.5">
              <Icon size={15} />
            </div>
            <p className="text-xs text-ink-600">{label}</p>
            <p className="text-sm font-700 text-ink-900 truncate mt-0.5">{value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Budget snapshot -> Budget section */}
        <motion.button
          {...cardMotion}
          transition={{ delay: 0.1, duration: 0.3 }}
          onClick={() => onNavigate('budget')}
          className={`card card-interactive p-5 text-left ${over ? 'border-rose-500/25' : ''}`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${over ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400' : 'bg-brand-500/15 text-brand-700 dark:text-brand-300'}`}>
              <Wallet size={17} />
            </div>
            <h3 className="font-display text-base font-700 text-ink-900">Budget</h3>
            <ArrowRight size={14} className="text-ink-500 ml-auto" />
          </div>
          <p className="text-2xl font-800 font-display text-ink-900">{trip.currency} {total.toLocaleString()}</p>
          <p className={`text-xs mt-1 ${over ? 'text-rose-700 dark:text-rose-400' : 'text-ink-600'}`}>
            {over ? `${trip.currency} ${Math.abs(remaining).toLocaleString()} over budget` : `${trip.currency} ${remaining.toLocaleString()} remaining`}
          </p>
        </motion.button>

        {/* Itinerary snapshot -> Days section */}
        <motion.button
          {...cardMotion}
          transition={{ delay: 0.15, duration: 0.3 }}
          onClick={() => onNavigate('days')}
          className="card card-interactive p-5 text-left"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center">
              <ListChecks size={17} />
            </div>
            <h3 className="font-display text-base font-700 text-ink-900">Itinerary</h3>
            <ArrowRight size={14} className="text-ink-500 ml-auto" />
          </div>
          <p className="text-2xl font-800 font-display text-ink-900">{totalActivities} activities</p>
          <p className="text-xs text-ink-600 mt-1">across {trip.days.length} {trip.days.length === 1 ? 'day' : 'days'}</p>
        </motion.button>
      </div>

      {/* Up next */}
      {nextActivity && nextDay && (
        <motion.div {...cardMotion} transition={{ delay: 0.2, duration: 0.3 }} className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-violet-300" />
            <h3 className="font-display text-base font-700 text-ink-900">Up next</h3>
          </div>
          <button onClick={() => onNavigate('days')} className="w-full text-left rounded-xl bg-ink-200/40 hover:bg-ink-300/50 transition px-4 py-3">
            <p className="text-xs text-ink-600">{nextDay.label} · {nextActivity.time}</p>
            <p className="text-sm font-600 text-ink-900 mt-0.5">{nextActivity.title}</p>
          </button>
        </motion.div>
      )}

      {trip.specialRequests && (
        <motion.div {...cardMotion} transition={{ delay: 0.25, duration: 0.3 }} className="card p-5">
          <h3 className="font-display text-sm font-700 text-ink-900 mb-1.5">Special requests</h3>
          <p className="text-sm text-ink-600 leading-relaxed">{trip.specialRequests}</p>
        </motion.div>
      )}
    </div>
  );
}
