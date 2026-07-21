import { useCallback, useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { AlertTriangle, Calendar, Compass, Gauge, Loader2, MapPin, Pencil, Users } from 'lucide-react';
import type { Screen, Trip, TripStatus } from '../types';
import { templateRepository } from '../data';
import DaySection from '../components/DaySection';
import DestinationHero from '../components/workspace/DestinationHero';
import DestinationThemeScope from '../components/workspace/DestinationThemeScope';
import SettingsSection from '../components/workspace/SettingsSection';
import { useExperienceTokens } from '../destinations';
import { formatDateRange } from '../utils/dates';

interface TemplateWorkspaceProps {
  templateId: string;
  onNavigate: (screen: Screen) => void;
  onUpdateTripFields: (id: string, fields: { title?: string; budget?: number; currency?: string; status?: TripStatus }) => Promise<void>;
}

type LoadStatus = 'loading' | 'ready' | 'error' | 'not_found';

/**
 * Read-only preview of a suggested trip plan. The itinerary and trip
 * details render exactly like a real trip (reusing DaySection,
 * DestinationHero, SettingsSection), but nothing here is actually owned by
 * anyone yet — there is no real `trips` row behind `templateId`.
 *
 * The moment the user attempts ANY edit — saving the settings form, or
 * touching any itinerary-affordance (add/edit/delete/lock/reorder) — this
 * deep-copies the template into a brand new trip under their account
 * (see templateRepository.cloneTemplateIntoTrip) and redirects them into
 * the ordinary Workspace for that new, fully-editable trip. The template
 * row itself is only ever read, never written, so it stays exactly as it
 * was for the next person to browse.
 *
 * Scope note (proof of concept): the AI concierge isn't offered on this
 * preview at all, since its edge function reads/writes a real trip_id and
 * making that safe to fire mid-clone is more than this first version
 * needs — once any edit here clones the plan, the resulting trip is a
 * completely normal Workspace where the AI concierge works exactly as it
 * does everywhere else.
 */
export default function TemplateWorkspace({ templateId, onNavigate, onUpdateTripFields }: TemplateWorkspaceProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [activeDay, setActiveDay] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const { tokens: destinationTokens, copy: destinationCopy, origin: destinationOrigin } =
    useExperienceTokens(trip?.destination ?? '');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    setLoadStatus('loading');
    const result = await templateRepository.getTemplateWithDetails(templateId);
    if (result.ok) {
      setTrip(result.data);
      setLoadStatus('ready');
      setActiveDay(0);
    } else if (result.error.code === 'NOT_FOUND') {
      setLoadStatus('not_found');
    } else {
      setLoadStatus('error');
    }
  }, [templateId]);

  useEffect(() => { void load(); }, [load]);

  // The single gate every mutating affordance on this page goes through.
  // `after` lets a caller (e.g. the settings form) apply the specific edit
  // it already has in hand to the freshly cloned trip, rather than cloning
  // a blind copy and making the user redo their change from scratch.
  const cloneAndContinue = useCallback(async (after?: (newTripId: string) => Promise<void>) => {
    if (cloning) return;
    setCloning(true);
    setCloneError(null);
    try {
      const result = await templateRepository.cloneTemplateIntoTrip(templateId);
      if (!result.ok) throw new Error(result.error.message);
      if (after) await after(result.data.id);
      onNavigate({ name: 'workspace', tripId: result.data.id });
    } catch (err) {
      setCloneError(err instanceof Error ? err.message : 'Could not start this plan. Please try again.');
      setCloning(false);
    }
  }, [cloning, templateId, onNavigate]);

  const handleSettingsSave = (fields: { title: string; budget: number; currency: string; status: TripStatus }) => {
    void cloneAndContinue((newTripId) => onUpdateTripFields(newTripId, fields));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) void cloneAndContinue();
  };

  if (loadStatus === 'loading') {
    return (
      <div className="p-6 space-y-5 max-w-4xl" role="status" aria-label="Loading suggested plan">
        <div className="skeleton h-7 w-64 mb-2.5" />
        <div className="skeleton h-4 w-96 max-w-full" />
        <div className="skeleton h-64 rounded-card" />
      </div>
    );
  }

  if (loadStatus === 'not_found') {
    return (
      <div className="card p-12 text-center" role="alert">
        <p className="text-base font-600 text-ink-800 mb-1">Suggested plan not found</p>
        <button onClick={() => onNavigate({ name: 'browse-templates' })} className="btn-primary mt-4">
          Back to suggested plans
        </button>
      </div>
    );
  }

  if (loadStatus === 'error' || !trip) {
    return (
      <div className="card p-12 text-center" role="alert">
        <AlertTriangle size={24} className="text-rose-800 dark:text-rose-400 mx-auto mb-3" />
        <p className="text-base font-600 text-ink-800 mb-1">Could not load this plan</p>
        <button onClick={load} className="btn-primary mt-4">Retry</button>
      </div>
    );
  }

  const showDestinationTheming = destinationOrigin !== 'default';
  const day = trip.days[activeDay];

  return (
    <DestinationThemeScope destination={trip.destination}>
      <div className="space-y-4 max-w-4xl">
        {showDestinationTheming && (
          <DestinationHero tokens={destinationTokens} copy={destinationCopy} destination={trip.destination} />
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-700 text-ink-900">{trip.title}</h1>
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-500/15 text-brand-700 dark:text-brand-300 px-2 py-0.5 text-xs font-600">
                <Compass size={11} /> Suggested Plan
              </span>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
                aria-label="Edit budget & trip details"
                title="Edit budget & trip details"
              >
                <Pencil size={16} />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {trip.destination}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDateRange(trip.startDate, trip.endDate)}</span>
              <span className="flex items-center gap-1.5"><Users size={13} /> {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</span>
              <span className="flex items-center gap-1.5"><Gauge size={13} /> {trip.pace}</span>
            </div>
          </div>
          {cloning && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium bg-brand-500/10 text-brand-700 dark:text-brand-300">
              <Loader2 size={12} className="animate-spin" /> Making this yours…
            </div>
          )}
        </div>

        <p className="text-sm text-ink-600 rounded-xl bg-brand-500/5 border border-brand-500/10 px-3.5 py-2.5 leading-relaxed">
          This is a suggested plan others can browse too. The moment you change the budget or the itinerary, it's copied into
          your own My Trips as a normal trip — the original stays exactly as it is for everyone else.
        </p>

        {cloneError && (
          <p className="text-sm text-rose-800 dark:text-rose-400" role="alert">{cloneError}</p>
        )}

        {showSettings ? (
          <SettingsSection
            trip={trip}
            onSave={handleSettingsSave}
            onRequestResetDemo={() => {}}
            resetLoading={false}
          />
        ) : (
          <div className="space-y-4">
            {trip.days.length === 0 ? (
              <div className="card p-8 text-center text-sm text-ink-600">This plan has no days yet.</div>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 mb-3">
                  {trip.days.map((d, i) => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDay(i)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-600 transition ${
                        activeDay === i ? 'bg-brand-500 text-white dark:text-black shadow-soft' : 'bg-ink-200/60 text-ink-600 hover:bg-ink-300/60'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                {day && (
                  <DaySection
                    day={day}
                    onAddActivity={() => void cloneAndContinue()}
                    onEditActivity={() => void cloneAndContinue()}
                    onDeleteActivity={() => void cloneAndContinue()}
                    onMoveToDayActivity={() => void cloneAndContinue()}
                    onMoveUpActivity={() => void cloneAndContinue()}
                    onMoveDownActivity={() => void cloneAndContinue()}
                    onToggleLock={() => void cloneAndContinue()}
                  />
                )}
              </DndContext>
            )}
          </div>
        )}
      </div>
    </DestinationThemeScope>
  );
}
