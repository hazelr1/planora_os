import { Plus, CalendarDays } from 'lucide-react';
import type { Day } from '../types';
import ActivityCard from './ActivityCard';
import EmptyState from './EmptyState';
import { formatDate } from '../utils/dates';

interface DaySectionProps {
  day: Day;
  onAddActivity: (dayId: string) => void;
  onEditActivity: (activityId: string) => void;
  onDeleteActivity: (activityId: string) => void;
  onMoveToDayActivity: (activityId: string) => void;
  onMoveUpActivity: (activityId: string) => void;
  onMoveDownActivity: (activityId: string) => void;
  onToggleLock: (activityId: string) => void;
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
}: DaySectionProps) {
  return (
    <section className="card overflow-hidden">
      {/* Day header */}
      <div className="px-5 py-4 border-b border-ink-100 bg-ink-50/40">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-display font-700 text-sm shrink-0 mt-0.5">
              {day.label.replace('Day ', '')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display text-base font-700 text-ink-900">{day.label}</h3>
                {day.theme && (
                  <span className="text-sm text-ink-500 font-medium">— {day.theme}</span>
                )}
              </div>
              <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
                <CalendarDays size={11} />
                {formatDate(day.date)}
              </p>
              {day.summary && (
                <p className="text-sm text-ink-500 mt-1.5 leading-relaxed max-w-prose">{day.summary}</p>
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

      {/* Activities list */}
      <div className="p-4 space-y-3">
        {day.activities.length === 0 ? (
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
          day.activities.map((a, idx) => (
            <ActivityCard
              key={a.id}
              activity={a}
              isFirst={idx === 0}
              isLast={idx === day.activities.length - 1}
              onEdit={() => onEditActivity(a.id)}
              onDelete={() => onDeleteActivity(a.id)}
              onMoveToDay={() => onMoveToDayActivity(a.id)}
              onMoveUp={() => onMoveUpActivity(a.id)}
              onMoveDown={() => onMoveDownActivity(a.id)}
              onToggleLock={() => onToggleLock(a.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
