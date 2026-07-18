import { Lock, Pencil, Trash2, AlertTriangle, MoveRight } from 'lucide-react';
import type { Day } from '../types';
import { formatDate } from '../utils/dates';
import { formatDuration } from '../utils/budget';
import { detectConflicts } from '../utils/schedule';

interface ListViewProps {
  days: Day[];
  currency: string;
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onMoveToDayActivity: (activityId: string) => void;
  onToggleLock: (activityId: string) => void;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
}

export default function ListView({
  days, currency, onEditActivity, onDeleteActivity, onMoveToDayActivity, onToggleLock, selectedActivityId, onSelectActivity,
}: ListViewProps) {
  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-glass/10">
        {days.map((day) => {
          const sorted = [...day.activities].sort((a, b) => a.time.localeCompare(b.time));
          const conflicts = detectConflicts(sorted);
          return (
            <div key={day.id}>
              <div className="px-5 py-2.5 bg-ink-200/30 flex items-center gap-2 sticky top-0 z-10">
                <span className="font-display text-sm font-700 text-ink-900">{day.label}</span>
                <span className="text-xs text-ink-600">{formatDate(day.date, { month: 'short', day: 'numeric' })}</span>
                {day.theme && <span className="text-xs text-ink-600">— {day.theme}</span>}
                {conflicts.size > 0 && (
                  <span className="chip bg-rose-500/15 text-rose-800 dark:text-rose-300 text-[10px]">
                    {conflicts.size} time conflict{conflicts.size === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {sorted.length === 0 ? (
                <p className="px-5 py-3 text-xs text-ink-500">No activities.</p>
              ) : (
                sorted.map((a, idx) => (
                  <div
                    key={a.id}
                    onClick={() => onSelectActivity?.(a.id)}
                    className={`px-5 py-3 flex items-center gap-3 hover:bg-glass/5 transition cursor-pointer animate-fade-in ${
                      selectedActivityId === a.id ? 'bg-brand-500/10' : ''
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 10) * 40}ms`, animationFillMode: 'backwards' }}
                  >
                    <span className="text-xs font-700 text-ink-600 tabular-nums w-12 shrink-0">{a.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-600 text-ink-900 truncate flex items-center gap-1.5">
                        {a.locked && <Lock size={11} className="text-brand-400 shrink-0" />}
                        {conflicts.has(a.id) && (
                          <AlertTriangle size={11} className="text-rose-800 dark:text-rose-400 shrink-0" aria-label="Time conflict" />
                        )}
                        {a.title}
                      </p>
                      <p className="text-xs text-ink-600 truncate">{a.category} · {formatDuration(a.duration)} · {a.cost === 0 ? 'Free' : `${currency} ${a.cost.toLocaleString()}`}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleLock(a.id); }}
                        className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
                        aria-label={a.locked ? 'Unlock' : 'Lock'}
                      >
                        <Lock size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditActivity(a.id); }}
                        className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
                        aria-label="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onMoveToDayActivity(a.id); }}
                        className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
                        aria-label="Move to day"
                      >
                        <MoveRight size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteActivity(a.id); }}
                        className="rounded-lg p-1.5 text-ink-500 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-500/10 transition"
                        aria-label="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
