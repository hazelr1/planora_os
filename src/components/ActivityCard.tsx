import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MapPin, Timer, DollarSign, Sparkles, Pencil, Trash2, Lock, Unlock, MoveRight,
  StickyNote, ExternalLink, ChevronUp, ChevronDown, GripVertical, History, AlertTriangle,
} from 'lucide-react';
import type { Activity, CostConfidence } from '../types';
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

// Text-only — no chip background, just a quiet colored dot next to the label.
const estimateQualityColors: Record<CostConfidence, string> = {
  high: 'text-emerald-800 dark:text-emerald-400',
  medium: 'text-amber-800 dark:text-amber-400',
  low: 'text-rose-800 dark:text-rose-400',
};

// Shared focus ring for every interactive control on the card — the app's
// buttons otherwise rely on the browser's native (often faint) outline;
// this matches the ring token `.input` already uses elsewhere for
// consistency, but via focus-visible so it doesn't flash on a plain click.
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40';

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
      className={`rounded-lg border transition-shadow hover:shadow-soft ${
        // border-ai-accent, not border-brand-400 — brand-300..600 are
        // destination-theme overrides (see cssVariables.ts), so a locked
        // card's border used to silently pick up whatever color that
        // destination's theme happened to use (e.g. pink for Tokyo).
        // ai-accent is a dedicated, theme-immune token.
        hasConflict ? 'border-rose-500/40 bg-rose-500/[0.03]' : activity.locked ? 'border-ai-accent/30 bg-ai-accent/[0.04]' : 'border-glass/10 bg-ink-200/30'
      } ${highlighted ? 'ring-2 ring-brand-400/60' : ''}`}
    >
      <div className="p-3.5 flex items-start gap-2.5">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`mt-0.5 shrink-0 rounded-lg p-2 text-ink-500 hover:text-ink-700 hover:bg-glass/5 transition cursor-grab active:cursor-grabbing touch-none ${focusRing}`}
          aria-label="Drag to reorder or move to another day"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={15} />
        </button>

        <div className="min-w-0 flex-1">
          {/* Time, category, lock state, conflict — one quiet line, no chip chrome except the one actionable signal */}
          <div className="flex items-baseline gap-x-2 gap-y-0.5 flex-wrap">
            <span className="text-sm font-600 text-ink-900 tabular-nums">{activity.time}</span>
            {activity.category !== 'Other' && (
              <span className="text-xs text-ink-500">{activity.category}</span>
            )}
            {activity.locked && (
              <span
                className="inline-flex items-center gap-1 text-xs font-600 text-ai-accent"
                title="Locked — protected from AI edits"
              >
                <Lock size={11} /> Locked
              </span>
            )}
            {hasConflict && (
              <span
                className="chip bg-rose-500/15 text-rose-800 dark:text-rose-300 text-[10px] font-600"
                title="This activity's time overlaps a neighboring activity — adjust the time or duration to resolve it."
              >
                <AlertTriangle size={11} /> Time conflict
              </span>
            )}
          </div>

          <h4 className="font-display text-base font-600 text-ink-900 mt-0.5">{activity.title}</h4>
          {activity.description && (
            <p className="text-sm text-ink-600 mt-0.5 leading-relaxed">{activity.description}</p>
          )}

          {/* Location, duration, cost */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-600">
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

          {/* AI reason — a quiet annotation (left-border accent), not a boxed sub-card. Only rendered when the AI actually left one. */}
          {activity.aiReason && (
            <div className="mt-2 pl-3 border-l-2 border-violet-400/30 flex items-start gap-1.5">
              <Sparkles size={12} className="text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-200 leading-relaxed">{activity.aiReason}</p>
            </div>
          )}

          {/* Estimate quality + last edited — one quiet line */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
            <span
              className={`inline-flex items-center gap-1 ${estimateQualityColors[activity.costConfidence]}`}
              title={`Estimate quality: ${activity.costConfidence} — based on typical travel prices, not a guaranteed cost.`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
              {activity.costConfidence} estimate
            </span>
            <span className="flex items-center gap-1 ml-auto" title={activity.updatedAt}>
              <History size={11} className="shrink-0" /> Updated {formatLastUpdated(activity.updatedAt)}
            </span>
          </div>

          {/* Notes */}
          {activity.notes.length > 0 && (
            <div className="mt-2.5 space-y-1">
              {activity.notes.map((note) => (
                <div key={note.id} className="flex items-start gap-2 rounded-lg bg-ink-200/40 px-3.5 py-2.5">
                  <StickyNote size={12} className="text-ink-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-ink-700 leading-relaxed flex-1">{note.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions — always visible, never hover-gated; touch-sized tap targets */}
          <div className="mt-2.5 flex items-center gap-0.5 flex-wrap border-t border-glass/10 pt-2.5">
            <button onClick={onEdit} className={`btn-ghost px-3 py-2 text-xs ${focusRing}`}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onMoveToDay} className={`btn-ghost px-3 py-2 text-xs ${focusRing}`}>
              <MoveRight size={12} /> Move to day
            </button>
            <button onClick={onToggleLock} className={`btn-ghost px-3 py-2 text-xs ${focusRing}`}>
              {activity.locked ? <Unlock size={12} /> : <Lock size={12} />}
              {activity.locked ? 'Unlock' : 'Lock'}
            </button>
            {activity.location && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-ghost px-3 py-2 text-xs ${focusRing}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={12} /> Maps
              </a>
            )}
            <button
              onClick={onDelete}
              className={`btn-ghost px-3 py-2 text-xs text-rose-800 dark:text-rose-400 hover:bg-rose-500/10 ml-auto ${focusRing}`}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>

        {/* Reorder — keyboard-operable alternative to the drag handle */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={`rounded-lg p-2 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition disabled:opacity-25 disabled:pointer-events-none ${focusRing}`}
            aria-label="Move up"
          >
            <ChevronUp size={15} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={`rounded-lg p-2 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition disabled:opacity-25 disabled:pointer-events-none ${focusRing}`}
            aria-label="Move down"
          >
            <ChevronDown size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
