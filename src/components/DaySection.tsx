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
}: DaySectionProps) {
  const sorted = sortActivities(day.activities);
  const conflicts = detectConflicts(sorted);
  const travel = estimateDayTravelMinutes(sorted);

  return (
    <section className="card overflow-hidden">
      {/* Day header */}
      <div className="px-5 py-4 border-b border-glass/10 bg-ink-200/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500 text-ink-950 flex items-center justify-center font-display font-700 text-sm shrink-0 mt-0.5">
              {day.label.replace('Day ', '')}
            </div>
            <div className="min-w-0">
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
                  <span className="chip bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
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
      </div>

      {/* Vertical timeline of activities */}
      <div className="p-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={22} />}
            title="No activities yet"
            description="Add something to do on this day."
            action={
              <button onClick={() => onAddActivity(day.id)} className="btn-outline text-xs">
                <Plus size={13} /> Add an activity
              </button>
            }
          />
        ) : (
          <SortableContext items={sorted.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="relative space-y-3">
              {/* Connecting timeline line */}
              <div className="absolute left-[1.65rem] top-2 bottom-2 w-px bg-glass/10" aria-hidden="true" />
              {sorted.map((a, idx, arr) => (
                <div
                  key={a.id}
                  className="relative pl-2 animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx, 8) * 60}ms`, animationFillMode: 'backwards' }}
                >
                  <span
                    className="absolute left-5 top-6 h-2.5 w-2.5 rounded-full bg-brand-400 border-2 border-ink-100 z-10"
                    aria-hidden="true"
                  />
                  <div className="pl-6">
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
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  );
}
