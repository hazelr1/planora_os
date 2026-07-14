import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, CalendarDays, Footprints } from 'lucide-react';
import type { Activity, Day } from '../types';
import ActivityCard from './ActivityCard';
import EmptyState from './EmptyState';
import { formatDate } from '../utils/dates';
import { timeToMinutes, detectConflicts, estimateDayTravelMinutes } from '../utils/schedule';

function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

interface DaySectionProps {
  day: Day;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onMoveToDayActivity: (activityId: string) => void;
  onMoveUpActivity: (activityId: string) => void;
  onMoveDownActivity: (activityId: string) => void;
  onToggleLock: (activityId: string) => void;
  /** Currently map-highlighted activity, if the Map view is open alongside. */
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  /** Destination-flavored override for the "no activities yet" empty state — see ExperienceCopy.emptyStateMessage. */
  emptyStateDescription?: string;
  /** Delay between each activity card's entrance, in ms — see ExperienceTokens.motion.staggerChildren. Defaults to the app's original fixed pace. */
  staggerMs?: number;
}

export default function DaySection({
  day,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveToDayActivity,
  onMoveUpActivity,
  onMoveDownActivity,
  onToggleLock,
  selectedActivityId,
  onSelectActivity,
  emptyStateDescription,
  staggerMs = 60,
}: DaySectionProps) {
  const sorted = sortActivities(day.activities);
  const conflicts = detectConflicts(sorted);
  const travel = estimateDayTravelMinutes(sorted);

  return (
    <section className="card overflow-hidden">
      <div className="relative p-5 sm:p-6">
        {/* Connecting timeline line — runs from the day marker through every activity dot */}
        <div className="absolute left-[18px] top-9 bottom-2 w-px bg-glass/10" aria-hidden="true" />

        {/* Day marker */}
        <div className="relative flex items-start justify-between gap-3 pb-6">
          <div className="flex items-start gap-3.5">
            <div className="relative z-10 h-9 w-9 rounded-full bg-brand-500 text-black flex items-center justify-center font-display font-700 text-sm shrink-0">
              {day.label.replace('Day ', '')}
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-700 text-ink-900">{day.label}</h3>
                {day.theme && (
                  <span className="text-sm text-ink-600 font-medium">— {day.theme}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                <p className="text-xs text-ink-600 flex items-center gap-1">
                  <CalendarDays size={11} />
                  {formatDate(day.date)}
                </p>
                {travel.estimatedSegments > 0 && (
                  <p
                    className="text-xs text-ink-600 flex items-center gap-1"
                    title={travel.missingSegments > 0 ? 'Partial estimate — some activities are missing coordinates' : 'Estimated from straight-line distance, not live traffic/transit data'}
                  >
                    <Footprints size={11} />
                    ~{travel.totalMinutes} min estimated travel{travel.missingSegments > 0 ? ' (partial)' : ''}
                  </p>
                )}
                {conflicts.size > 0 && (
                  <span className="chip bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px]">
                    {conflicts.size} time conflict{conflicts.size === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {day.summary && (
                <p className="text-sm text-ink-600 mt-1.5 leading-relaxed max-w-prose">{day.summary}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => onAddActivity(day.id)}
            className="btn-outline px-3 py-2 text-xs shrink-0"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Activities, nested to the right of the timeline line */}
        {sorted.length === 0 ? (
          <div className="pl-11">
            <EmptyState
              icon={<CalendarDays size={22} />}
              title="No activities yet"
              description={emptyStateDescription || 'Add something to do on this day.'}
              action={
                <button onClick={() => onAddActivity(day.id)} className="btn-outline text-xs">
                  <Plus size={13} /> Add an activity
                </button>
              }
            />
          </div>
        ) : (
          <SortableContext items={sorted.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4 pb-1">
              {sorted.map((a, idx, arr) => (
                <div
                  key={a.id}
                  className="relative pl-11 animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * staggerMs}ms`, animationFillMode: 'backwards' }}
                >
                  <span
                    className="absolute left-[18px] top-6 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-400 border-2 border-ink-100 z-10"
                    aria-hidden="true"
                  />
                  <ActivityCard
                    activity={a}
                    isFirst={idx === 0}
                    isLast={idx === arr.length - 1}
                    onEdit={() => onEditActivity(a.id)}
                    onDelete={() => onDeleteActivity(a.id)}
                    onMoveToDay={() => onMoveToDayActivity(a.id)}
                    onMoveUp={() => onMoveUpActivity(a.id)}
                    onMoveDown={() => onMoveDownActivity(a.id)}
                    onToggleLock={() => onToggleLock(a.id)}
                    highlighted={selectedActivityId === a.id}
                    onSelect={onSelectActivity ? () => onSelectActivity(a.id) : undefined}
                    hasConflict={conflicts.has(a.id)}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
}
