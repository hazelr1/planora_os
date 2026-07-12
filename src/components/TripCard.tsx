import { MapPin, Calendar, Wallet, Users, Copy, Trash2, ArrowRight, Clock, Pencil } from 'lucide-react';
import type { Trip } from '../types';
import { formatDateRange, formatLastUpdated } from '../utils/dates';

interface TripCardProps {
  trip: Trip;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const statusStyles: Record<string, string> = {
  Planning: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  Confirmed: 'bg-brand-500/15 text-brand-300 border border-brand-400/20',
  Completed: 'bg-white/5 text-ink-600 border border-white/10',
};

export default function TripCard({ trip, onOpen, onEdit, onDuplicate, onDelete }: TripCardProps) {
  return (
    <div className="card card-interactive overflow-hidden flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-700 text-ink-900 truncate">{trip.title}</h3>
            <p className="text-sm text-ink-600 flex items-center gap-1.5 mt-1">
              <MapPin size={13} className="shrink-0" /> {trip.destination}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`chip ${statusStyles[trip.status] ?? statusStyles.Planning}`}>
              {trip.status}
            </span>
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-white/5 transition"
              aria-label={`Edit ${trip.title}`}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-ink-500" />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Wallet size={13} className="text-ink-500" />
              <span className="font-medium">{trip.currency} {trip.budget.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-2">
              <Users size={13} className="text-ink-500" />
              {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </div>
        </div>

        {trip.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {trip.interests.slice(0, 4).map((i) => (
              <span key={i} className="chip bg-white/5 text-ink-600 text-[10px] border border-white/10">{i}</span>
            ))}
            {trip.interests.length > 4 && (
              <span className="chip bg-white/5 text-ink-500 text-[10px] border border-white/10">+{trip.interests.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 mt-3 border-t border-white/10 flex items-center gap-1 text-xs text-ink-500">
          <Clock size={11} />
          <span>Updated {formatLastUpdated(trip.lastUpdated)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={onOpen} className="btn-primary flex-1 text-sm">
            Open <ArrowRight size={14} />
          </button>
          <button onClick={onDuplicate} className="btn-outline px-3" aria-label={`Duplicate ${trip.title}`}>
            <Copy size={15} />
          </button>
          <button
            onClick={onDelete}
            className="btn-outline px-3 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
            aria-label={`Delete ${trip.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
