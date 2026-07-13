import type { Day } from '../types';
import ActivityCard from './ActivityCard';
import EmptyState from './EmptyState';
import { CalendarDays, Footprints } from 'lucide-react';
import { detectConflicts, estimateDayTravelMinutes } from '../utils/schedule';

interface CalendarViewProps {
  days: Day[];
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onMoveToDayActivity: (activityId: string) => void;
  onMoveUpActivity: (activityId: string) => void;
  onMoveDownActivity: (activityId: string) => void;
  onToggleLock: (activityId: string) => void;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
}

function dateBadge(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    day: d.toLocaleDateString('en-US', { day: 'numeric' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
  };
}

export default function CalendarView({
  days, onEditActivity, onDeleteActivity, onMoveToDayActivity, onMoveUpActivity, onMoveDownActivity,
  onToggleLock, selectedActivityId, onSelectActivity,
}: CalendarViewProps) {
  if (days.length === 0) {
    return (
      <div className="card">
        <EmptyState icon={<CalendarDays size={22} />} title="No days in this trip" description="This trip has no itinerary days." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const badge = dateBadge(day.date);
        const sorted = [...day.activities].sort((a, b) => a.time.localeCompare(b.time));
        const conflicts = detectConflicts(sorted);
        const travel = estimateDayTravelMinutes(sorted);
        return (
          <div key={day.id} className="flex gap-4">
            {/* Date badge */}
            <div className="shrink-0 w-16 text-center pt-1">
              <div className="rounded-xl border border-glass/10 bg-ink-200/40 overflow-hidden">
                <div className="bg-brand-500 text-ink-950 text-[10px] font-700 uppercase py-1">{badge.weekday}</div>
                <div className="py-1.5">
                  <p className="font-display text-xl font-800 text-ink-900 leading-none">{badge.day}</p>
                  <p className="text-[10px] text-ink-600 mt-0.5">{badge.month}</p>
                </div>
              </div>
            </div>

            {/* Day content */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
                <h3 className="font-display text-sm font-700 text-ink-900">{day.label}</h3>
                {day.theme && <span className="text-xs text-ink-600">— {day.theme}</span>}
                {travel.estimatedSegments > 0 && (
                  <span className="text-xs text-ink-600 flex items-center gap-1" title="Estimated from straight-line distance, not live traffic/transit data">
                    <Footprints size={11} /> ~{travel.totalMinutes} min travel
                  </span>
                )}
                {conflicts.size > 0 && (
                  <span className="chip bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px]">
                    {conflicts.size} time conflict{conflicts.size === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {sorted.length === 0 ? (
                <p className="text-xs text-ink-500 italic">No activities planned.</p>
              ) : (
                <div className="space-y-2.5">
                  {sorted.map((a, idx, arr) => (
                    <div key={a.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx, 8) * 60}ms`, animationFillMode: 'backwards' }}>
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
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
