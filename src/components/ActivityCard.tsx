import { MapPin, Timer, DollarSign, Sparkles, Pencil, Trash2, Lock, Unlock, MoveRight, StickyNote, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import type { Activity, ActivityCategory } from '../types';
import { formatDuration } from '../utils/budget';

interface ActivityCardProps {
  activity: Activity;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveToDay: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleLock: () => void;
}

const categoryColors: Record<ActivityCategory, string> = {
  Food: 'bg-amber-100 text-amber-700',
  Culture: 'bg-sky-100 text-sky-700',
  Nature: 'bg-emerald-100 text-emerald-700',
  Adventure: 'bg-orange-100 text-orange-700',
  History: 'bg-stone-100 text-stone-700',
  Shopping: 'bg-pink-100 text-pink-700',
  Nightlife: 'bg-violet-100 text-violet-700',
  Transport: 'bg-slate-100 text-slate-700',
  Accommodation: 'bg-teal-100 text-teal-700',
  Other: 'bg-ink-100 text-ink-600',
};

export default function ActivityCard({
  activity,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onMoveToDay,
  onMoveUp,
  onMoveDown,
  onToggleLock,
}: ActivityCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location + ', ' + activity.title)}`;

  return (
    <div className={`rounded-xl border bg-white transition-shadow hover:shadow-soft ${activity.locked ? 'border-brand-200 bg-brand-50/20' : 'border-ink-100'}`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-700 text-ink-500 tabular-nums">{activity.time}</span>
              <span className={`chip ${categoryColors[activity.category] ?? categoryColors.Other}`}>
                {activity.category}
              </span>
              {activity.locked && (
                <span className="chip bg-brand-100 text-brand-700 font-600">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <h4 className="font-display text-base font-700 text-ink-900 mt-1">{activity.title}</h4>
            {activity.description && (
              <p className="text-sm text-ink-500 mt-1 leading-relaxed">{activity.description}</p>
            )}
          </div>

          {/* Up / Down reorder */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="rounded-lg p-1 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition disabled:opacity-25 disabled:pointer-events-none"
              aria-label="Move up"
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="rounded-lg p-1 text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition disabled:opacity-25 disabled:pointer-events-none"
              aria-label="Move down"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
          {activity.location && (
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={13} className="text-ink-400 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Timer size={13} className="text-ink-400 shrink-0" />
            {formatDuration(activity.duration)}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign size={13} className="text-ink-400 shrink-0" />
            {activity.cost === 0 ? 'Free' : `${activity.currency} ${activity.cost.toLocaleString()}`}
          </span>
        </div>

        {/* AI reason */}
        {activity.aiReason && (
          <div className="mt-3 rounded-lg bg-brand-50/60 border border-brand-100 px-3 py-2 flex items-start gap-2">
            <Sparkles size={13} className="text-brand-600 mt-0.5 shrink-0" />
            <p className="text-xs text-brand-800 leading-relaxed">{activity.aiReason}</p>
          </div>
        )}

        {/* Notes */}
        {activity.notes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {activity.notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2 rounded-lg bg-ink-50 border border-ink-100 px-3 py-2">
                <StickyNote size={12} className="text-ink-400 mt-0.5 shrink-0" />
                <span className="text-xs text-ink-700 leading-relaxed flex-1">{note.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-1 flex-wrap border-t border-ink-100 pt-3">
          <button onClick={onEdit} className="btn-ghost px-2.5 py-1.5 text-xs">
            <Pencil size={12} /> Edit
          </button>
          <button onClick={onMoveToDay} className="btn-ghost px-2.5 py-1.5 text-xs">
            <MoveRight size={12} /> Move to day
          </button>
          <button onClick={onToggleLock} className="btn-ghost px-2.5 py-1.5 text-xs">
            {activity.locked ? <Unlock size={12} /> : <Lock size={12} />}
            {activity.locked ? 'Unlock' : 'Lock'}
          </button>
          {activity.location && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost px-2.5 py-1.5 text-xs"
            >
              <ExternalLink size={12} /> Maps
            </a>
          )}
          <button
            onClick={onDelete}
            className="btn-ghost px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 ml-auto"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
