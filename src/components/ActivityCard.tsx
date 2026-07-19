import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MapPin, Timer, DollarSign, Sparkles, Pencil, Trash2, Lock, Unlock, MoveRight,
  StickyNote, ExternalLink, ChevronUp, ChevronDown, GripVertical, CloudOff, History, AlertTriangle,
} from 'lucide-react';
import type { Activity, ActivityCategory, CostConfidence } from '../types';
import { formatDuration } from '../utils/budget';
import { formatLastUpdated } from '../utils/dates';

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
  highlighted?: boolean;
  onSelect?: () => void;
  hasConflict?: boolean;
}

const categoryColors: Record<ActivityCategory, string> = {
  Food: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  Culture: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  Nature: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
  Adventure: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  History: 'bg-stone-500/15 text-stone-700 dark:text-stone-300',
  Shopping: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  Nightlife: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  Transport: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  Accommodation: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  Other: 'bg-glass/5 text-ink-600',
};

// Text-only (no chip background) — used in the quiet meta line, not a pill.
const estimateQualityColors: Record<CostConfidence, string> = {
  high: 'text-emerald-800 dark:text-emerald-400',
  medium: 'text-amber-800 dark:text-amber-400',
  low: 'text-rose-800 dark:text-rose-400',
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
  highlighted = false,
  onSelect,
  hasConflict = false,
}: ActivityCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location + ', ' + activity.title)}`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`rounded-xl border bg-ink-200/40 backdrop-blur-sm transition-shadow hover:shadow-soft ${
        hasConflict ? 'border-rose-500/40' : activity.locked ? 'border-brand-400/30 bg-brand-500/5' : 'border-glass/10'
      } ${highlighted ? 'ring-2 ring-brand-400/60' : ''}`}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 rounded-lg p-1 text-ink-500 hover:text-ink-700 hover:bg-glass/5 transition cursor-grab active:cursor-grabbing touch-none"
            aria-label="Drag to reorder or move to another day"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={15} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-700 text-ink-600 tabular-nums">{activity.time}</span>
              <span className={`chip ${categoryColors[activity.category] ?? categoryColors.Other}`}>
                {activity.category}
              </span>
              {activity.locked && (
                <span className="chip bg-brand-500/15 text-brand-700 dark:text-brand-300 font-600">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <h4 className="font-display text-base font-700 text-ink-900 mt-1.5">{activity.title}</h4>
            {activity.description && (
              <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{activity.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="rounded-lg p-1 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition disabled:opacity-25 disabled:pointer-events-none"
              aria-label="Move up"
            >
              <ChevronUp size={15} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="rounded-lg p-1 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition disabled:opacity-25 disabled:pointer-events-none"
              aria-label="Move down"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-600">
          {activity.location && (
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={13} className="text-ink-500 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Timer size={13} className="text-ink-500 shrink-0" />
            {formatDuration(activity.duration)}
          </span>
          <span className="flex items-center gap-1.5">
            <DollarSign size={13} className="text-ink-500 shrink-0" />
            {activity.cost === 0 ? 'Free' : `${activity.currency} ${activity.cost.toLocaleString()}`}
          </span>
        </div>

        {/* Conflict — the one genuinely actionable signal here, kept as a chip so it stands out */}
        {hasConflict && (
          <div className="mt-2.5">
            <span
              className="chip bg-rose-500/15 text-rose-800 dark:text-rose-300 font-600"
              title="This activity's time overlaps a neighboring activity — adjust the time or duration to resolve it."
            >
              <AlertTriangle size={11} /> Time conflict
            </span>
          </div>
        )}

        {/* AI reason — a quiet annotation (left-border accent), not a boxed sub-card */}
        {activity.aiReason && (
          <div className="mt-3 pl-3 border-l-2 border-violet-400/30 flex items-start gap-1.5">
            <Sparkles size={12} className="text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700 dark:text-violet-200 leading-relaxed">{activity.aiReason}</p>
          </div>
        )}

        {/* Secondary meta — same info as before (estimate quality, weather availability, last edited), now one quiet text line instead of three separate pill chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span
            className={`inline-flex items-center gap-1 ${estimateQualityColors[activity.costConfidence]}`}
            title={`Estimate quality: ${activity.costConfidence} — based on typical travel prices, not a guaranteed cost.`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
            {activity.costConfidence} estimate
          </span>
          <span className="flex items-center gap-1" title="Weather forecasts require a weather provider to be connected">
            <CloudOff size={11} className="shrink-0" /> Weather unavailable
          </span>
          <span className="flex items-center gap-1 ml-auto" title={activity.updatedAt}>
            <History size={11} className="shrink-0" /> Updated {formatLastUpdated(activity.updatedAt)}
          </span>
        </div>

        {/* Notes */}
        {activity.notes.length > 0 && (
          <div className="mt-3.5 space-y-1.5">
            {activity.notes.map((note) => (
              <div key={note.id} className="flex items-start gap-2 rounded-lg bg-ink-200/40 px-3.5 py-2.5">
                <StickyNote size={12} className="text-ink-500 mt-0.5 shrink-0" />
                <span className="text-xs text-ink-700 leading-relaxed flex-1">{note.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-1 flex-wrap border-t border-glass/10 pt-3.5">
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
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} /> Maps
            </a>
          )}
          <button
            onClick={onDelete}
            className="btn-ghost px-2.5 py-1.5 text-xs text-rose-800 dark:text-rose-400 hover:bg-rose-500/10 ml-auto"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}