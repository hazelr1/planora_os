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
  Planning: 'bg-amber-100 text-amber-700',
  Confirmed: 'bg-brand-100 text-brand-700',
  Completed: 'bg-ink-100 text-ink-600',
};

export default function TripCard({ trip, onOpen, onEdit, onDuplicate, onDelete }: TripCardProps) {
  return (
    <div className="card overflow-hidden hover:shadow-pop transition-shadow duration-200 flex flex-col">
      <div className="h-1.5 bg-gradient-to-r from-brand-500 to-sky-400" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-700 text-ink-900 truncate">{trip.title}</h3>
            <p className="text-sm text-ink-500 flex items-center gap-1.5 mt-1">
              <MapPin size={13} className="shrink-0" /> {trip.destination}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`chip ${statusStyles[trip.status] ?? statusStyles.Planning}`}>
              {trip.status}
            </span>
            <button
              onClick={onEdit}
              className="rounded-lg p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition"
              aria-label={`Edit ${trip.title}`}
            >
              <Pencil size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-ink-400" />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Wallet size={13} className="text-ink-400" />
              <span className="font-medium">{trip.currency} {trip.budget.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-2">
              <Users size={13} className="text-ink-400" />
              {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </div>
        </div>

        {trip.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {trip.interests.slice(0, 4).map((i) => (
              <span key={i} className="chip bg-ink-100 text-ink-600 text-[10px]">{i}</span>
            ))}
            {trip.interests.length > 4 && (
              <span className="chip bg-ink-100 text-ink-500 text-[10px]">+{trip.interests.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 mt-3 border-t border-ink-100 flex items-center gap-1 text-xs text-ink-400">
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
            className="btn-outline px-3 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
            aria-label={`Delete ${trip.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
