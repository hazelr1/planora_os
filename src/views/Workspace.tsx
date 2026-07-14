import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  AlertTriangle, Calendar, CheckCircle2, Clock, FlaskConical, Gauge, List as ListIcon,
  Loader2, Map as MapIcon, MapPin, Pencil, RefreshCw, Save, CalendarDays, Users,
} from 'lucide-react';
import type { AIRevisionProposal, Activity, Screen, Trip, TripStatus } from '../types';
import DaySection from '../components/DaySection';
import CalendarView from '../components/CalendarView';
import ListView from '../components/ListView';
import MapView from '../components/MapView';
import AIChangeReview from '../components/AIChangeReview';
import ActivityModal, { type ActivityModalData } from '../components/ActivityModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import EmptyState from '../components/EmptyState';
import WorkspaceShell from '../components/workspace/WorkspaceShell';
import DestinationThemeScope from '../components/workspace/DestinationThemeScope';
import DestinationHero from '../components/workspace/DestinationHero';
import DestinationDivider from '../components/workspace/DestinationDivider';
import { useExperienceTokens } from '../destinations';
import OverviewSection from '../components/workspace/OverviewSection';
import FlightsSection from '../components/workspace/FlightsSection';
import HotelsSection from '../components/workspace/HotelsSection';
import BudgetSection from '../components/workspace/BudgetSection';
import PackingSection from '../components/workspace/PackingSection';
import DocumentsSection from '../components/workspace/DocumentsSection';
import GallerySection from '../components/workspace/GallerySection';
import SettingsSection from '../components/workspace/SettingsSection';
import type { WorkspaceSectionId } from '../components/workspace/types';
import { useActivityEditor } from '../hooks/useActivityEditor';
import { useSaveStatus } from '../hooks/useSaveStatus';
import { tripRepository } from '../data';
import { supabase } from '../lib/supabase';
import { formatDateRange } from '../utils/dates';
import { timeToMinutes } from '../utils/schedule';

interface WorkspaceProps {
  tripId: string;
  onNavigate: (screen: Screen) => void;
  onUpdateTripFields: (id: string, fields: { title?: string; budget?: number; currency?: string; status?: TripStatus }) => Promise<void>;
}

type LoadStatus = 'loading' | 'ready' | 'error' | 'not_found';
type ViewMode = 'timeline' | 'calendar' | 'map' | 'list';

function sortByTime(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

function SaveBar({ status, errorMessage, retry }: { status: string; errorMessage: string | null; retry: (() => void) | null }) {
  if (status === 'idle') return null;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
      status === 'saving' ? 'bg-brand-500/10 text-brand-300' :
      status === 'saved' ? 'bg-emerald-500/10 text-emerald-300' :
      'bg-rose-500/10 text-rose-300'
    }`}>
      {status === 'saving' && <Loader2 size={12} className="animate-spin" />}
      {status === 'saved' && <Save size={12} />}
      {status === 'error' && <AlertTriangle size={12} />}
      <span>
        {status === 'saving' && 'Saving…'}
        {status === 'saved' && 'Saved'}
        {status === 'error' && (errorMessage ?? 'Save failed.')}
      </span>
      {status === 'error' && retry && (
        <button onClick={retry} className="underline underline-offset-2 hover:no-underline ml-1">
          Retry
        </button>
      )}
    </div>
  );
}

// Module-scope so drop-target identity is stable across renders — an inline
// component defined inside Workspace's body would remount on every render
// (the same bug pattern that caused focus loss in SignIn's form fields).
function DayTabButton({
  day, isActive, onClick,
}: {
  day: Trip['days'][number]; isActive: boolean; onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `daytab-${day.id}` });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`shrink-0 rounded-xl px-4 py-2 text-sm font-600 transition ${
        isActive
          ? 'bg-brand-500 text-ink-950 shadow-soft'
          : isOver
          ? 'bg-brand-500/20 border border-brand-400/40 text-brand-200'
          : 'bg-ink-200/60 border border-glass/10 text-ink-600 hover:bg-ink-300/60'
      }`}
    >
      {day.label}
      {isOver && <span className="ml-1.5 text-[10px] opacity-70">drop here</span>}
    </button>
  );
}

const VIEW_TABS: { id: ViewMode; label: string; Icon: typeof Clock }[] = [
  { id: 'timeline', label: 'Timeline', Icon: Clock },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
  { id: 'map', label: 'Map', Icon: MapIcon },
  { id: 'list', label: 'List', Icon: ListIcon },
];

export default function Workspace({ tripId, onNavigate, onUpdateTripFields }: WorkspaceProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>('overview');
  const [activeDay, setActiveDay] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [modal, setModal] = useState<ActivityModalData | null>(null);
  const [moveActivityId, setMoveActivityId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reviewProposal, setReviewProposal] = useState<AIRevisionProposal | null>(null);
  const [showAppliedBanner, setShowAppliedBanner] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [copilotPrompt, setCopilotPrompt] = useState<string | null>(null);

  const { status: saveStatus, errorMessage, track, retry } = useSaveStatus();

  const setTripSafe = useCallback((t: Trip) => setTrip(t), []);
  const editor = useActivityEditor(trip ?? ({} as Trip), setTripSafe, track);
  const { tokens: destinationTokens, copy: destinationCopy, origin: destinationOrigin } =
    useExperienceTokens(trip?.destination ?? '');
  const moveDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(moveDialogRef, !!moveActivityId);

  useEffect(() => {
    if (!moveActivityId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoveActivityId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveActivityId]);

  // KeyboardSensor makes the drag handle itself operable via keyboard (Tab
  // to it, Space to pick up, arrow keys to move, Space to drop, Escape to
  // cancel) — reordering within a day and moving between days already had
  // full keyboard-operable alternatives (the up/down chevrons and the
  // "Move to day" button on each activity card), so this closes the last
  // gap: using the same interaction model as a mouse user, not a secondary
  // one.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoadStatus('loading');
    const result = await tripRepository.getTripWithDetails(tripId);
    if (result.ok) {
      setTrip(result.data);
      setLoadStatus('ready');
      setActiveDay(0);
    } else if (result.error.code === 'NOT_FOUND') {
      setLoadStatus('not_found');
    } else {
      setLoadStatus('error');
    }
  }, [tripId]);

  useEffect(() => { void load(); }, [load]);

  const handleRevisionApplied = useCallback(async () => {
    setReviewProposal(null);
    await load();
    setShowAppliedBanner(true);
    setTimeout(() => setShowAppliedBanner(false), 4000);
  }, [load]);

  const handleResetDemo = useCallback(async () => {
    setResetLoading(true);
    setResetError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-demo-trip`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          signal: AbortSignal.timeout(30_000),
        },
      );
      const json = await res.json() as { trip_id?: string; error?: string };
      if (res.ok && json.trip_id) {
        onNavigate({ name: 'workspace', tripId: json.trip_id });
      }
    } catch {
      setResetError('Could not reset demo trip. Please try again.');
    } finally {
      setResetLoading(false);
      setResetConfirm(false);
    }
  }, [onNavigate]);

  // ── Drag and drop: reorder within a day, or drop on a day tab to move ──────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!trip || !over) return;

    const activityId = String(active.id);
    const overId = String(over.id);
    if (activityId === overId) return;

    if (overId.startsWith('daytab-')) {
      const targetDayId = overId.slice('daytab-'.length);
      const sourceDay = trip.days.find((d) => d.activities.some((a) => a.id === activityId));
      if (!sourceDay || sourceDay.id === targetDayId) return;
      editor.moveToDay(activityId, targetDayId);
      const idx = trip.days.findIndex((d) => d.id === targetDayId);
      if (idx >= 0) setActiveDay(idx);
      return;
    }

    const day = trip.days[activeDay];
    if (!day) return;
    const ordered = sortByTime(day.activities);
    const oldIndex = ordered.findIndex((a) => a.id === activityId);
    const newIndex = ordered.findIndex((a) => a.id === overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const reordered = arrayMove(ordered, oldIndex, newIndex);
    editor.reorderDay(day.id, reordered.map((a) => a.id));
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="p-6 space-y-5">
        <div>
          <div className="skeleton h-7 w-64 mb-2.5" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-8 w-20" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-28" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="space-y-5">
            <div className="skeleton h-40" />
            <div className="skeleton h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (loadStatus === 'not_found') {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <p className="text-base font-600 text-ink-800 mb-1">Trip not found</p>
          <p className="text-sm text-ink-600 mb-6">This trip may have been deleted.</p>
          <button onClick={() => onNavigate({ name: 'trips' })} className="btn-primary">
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <AlertTriangle size={24} className="text-rose-400 mx-auto mb-3" />
          <p className="text-base font-600 text-ink-800 mb-1">Could not load this trip</p>
          <p className="text-sm text-ink-600 mb-6">Please check your connection and try again.</p>
          <button onClick={load} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (!trip) return null;

  const showDestinationTheming = destinationOrigin === 'handcrafted';
  const dateRange = formatDateRange(trip.startDate, trip.endDate);

  const openAdd = (dayId: string) => setModal({ mode: 'add', activity: null, dayId });

  const openEdit = (activityId: string) => {
    for (const day of trip.days) {
      const act = day.activities.find((a) => a.id === activityId);
      if (act) { setModal({ mode: 'edit', activity: act, dayId: day.id }); return; }
    }
  };

  const executeDelete = () => {
    if (confirmDeleteId) editor.deleteActivity(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const executeMoveToDay = (targetDayId: string) => {
    if (!moveActivityId) return;
    editor.moveToDay(moveActivityId, targetDayId);
    setMoveActivityId(null);
    const idx = trip.days.findIndex((d) => d.id === targetDayId);
    if (idx >= 0) setActiveDay(idx);
  };

  const handleTripSettingsSave = (fields: { title: string; budget: number; currency: string; status: TripStatus }) => {
    const prev = trip;
    setTrip({ ...trip, ...fields });
    void track(async () => {
      try {
        await onUpdateTripFields(trip.id, fields);
      } catch {
        setTrip(prev);
        throw new Error('Failed to save trip changes.');
      }
    });
  };

  const draggedActivity = activeDragId
    ? trip.days.flatMap((d) => d.activities).find((a) => a.id === activeDragId)
    : null;

  const header = (
    <div className="space-y-4">
      {showDestinationTheming && (
        <DestinationHero tokens={destinationTokens} copy={destinationCopy} destination={trip.destination} />
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-800 text-ink-900">{trip.title}</h1>
            {trip.isDemo && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2 py-0.5 text-xs font-700">
                <FlaskConical size={11} /> Demo Data
              </span>
            )}
            <button
              onClick={() => setActiveSection('settings')}
              className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
              aria-label="Edit trip settings"
              title="Edit trip settings"
            >
              <Pencil size={16} />
            </button>
            {trip.isDemo && (
              <button
                onClick={() => setResetConfirm(true)}
                disabled={resetLoading}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-600 text-ink-500 hover:text-ink-800 hover:bg-glass/5 border border-glass/10 transition"
                title="Reset demo trip to original state"
              >
                {resetLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Reset Demo
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
            <span className="flex items-center gap-1.5"><MapPin size={13} /> {trip.destination}</span>
            <span className="flex items-center gap-1.5"><Calendar size={13} /> {dateRange}</span>
            <span className="flex items-center gap-1.5"><Users size={13} /> {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}</span>
            <span className="flex items-center gap-1.5"><Gauge size={13} /> {trip.pace}</span>
          </div>
        </div>
        <div className="sm:shrink-0">
          <SaveBar status={saveStatus} errorMessage={errorMessage} retry={retry} />
        </div>
      </div>

      {showAppliedBanner && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center gap-2.5" role="status">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">Changes applied. Your itinerary has been updated.</p>
        </div>
      )}

      {showDestinationTheming && <DestinationDivider tokens={destinationTokens} />}
    </div>
  );

  let sectionContent: React.ReactNode;
  switch (activeSection) {
    case 'overview':
      sectionContent = <OverviewSection trip={trip} onAskCopilot={setCopilotPrompt} onNavigate={setActiveSection} />;
      break;
    case 'flights':
      sectionContent = <FlightsSection trip={trip} />;
      break;
    case 'hotels':
      sectionContent = <HotelsSection trip={trip} />;
      break;
    case 'budget':
      sectionContent = <BudgetSection trip={trip} />;
      break;
    case 'packing':
      sectionContent = <PackingSection trip={trip} />;
      break;
    case 'documents':
      sectionContent = <DocumentsSection tripId={trip.id} />;
      break;
    case 'gallery':
      sectionContent = <GallerySection tripId={trip.id} />;
      break;
    case 'settings':
      sectionContent = (
        <SettingsSection
          trip={trip}
          onSave={handleTripSettingsSave}
          onRequestResetDemo={() => setResetConfirm(true)}
          resetLoading={resetLoading}
        />
      );
      break;
    case 'days':
    default:
      sectionContent = (
        <div className="space-y-4">
          {/* View switcher */}
          <div className="flex gap-1.5 rounded-xl bg-ink-200/60 p-1 w-full sm:w-fit overflow-x-auto">
            {VIEW_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-600 transition shrink-0 ${
                  viewMode === id ? 'bg-ink-300/80 text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {trip.days.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Calendar size={22} />}
                title="No days in this trip"
                description="This trip has no itinerary days. Try creating a new trip with a valid date range."
              />
            </div>
          ) : viewMode === 'timeline' ? (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 mb-3">
                {trip.days.map((d, i) => (
                  <DayTabButton key={d.id} day={d} isActive={activeDay === i} onClick={() => setActiveDay(i)} />
                ))}
              </div>
              <DaySection
                day={trip.days[activeDay]}
                onAddActivity={openAdd}
                onEditActivity={openEdit}
                onDeleteActivity={(id) => setConfirmDeleteId(id)}
                onMoveToDayActivity={setMoveActivityId}
                onMoveUpActivity={editor.moveUp}
                onMoveDownActivity={editor.moveDown}
                onToggleLock={editor.toggleLock}
                selectedActivityId={selectedActivityId}
                onSelectActivity={setSelectedActivityId}
              />
              <DragOverlay>
                {draggedActivity ? (
                  <div className="rounded-xl border border-brand-400/40 bg-ink-200 px-4 py-3 shadow-pop text-sm font-600 text-ink-900">
                    {draggedActivity.title}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : viewMode === 'calendar' ? (
            <CalendarView
              days={trip.days}
              onEditActivity={openEdit}
              onDeleteActivity={(id) => setConfirmDeleteId(id)}
              onMoveToDayActivity={setMoveActivityId}
              onMoveUpActivity={editor.moveUp}
              onMoveDownActivity={editor.moveDown}
              onToggleLock={editor.toggleLock}
              selectedActivityId={selectedActivityId}
              onSelectActivity={setSelectedActivityId}
            />
          ) : viewMode === 'map' ? (
            <MapView
              days={trip.days}
              currency={trip.currency}
              selectedActivityId={selectedActivityId}
              onSelectActivity={setSelectedActivityId}
            />
          ) : (
            <ListView
              days={trip.days}
              currency={trip.currency}
              onEditActivity={openEdit}
              onDeleteActivity={(id) => setConfirmDeleteId(id)}
              onToggleLock={editor.toggleLock}
              selectedActivityId={selectedActivityId}
              onSelectActivity={setSelectedActivityId}
            />
          )}
        </div>
      );
      break;
  }

  return (
    <DestinationThemeScope destination={trip.destination}>
      <WorkspaceShell
        trip={trip}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        header={header}
        onRevisionProposed={setReviewProposal}
        externalPrompt={copilotPrompt}
        onExternalPromptHandled={() => setCopilotPrompt(null)}
        aiGreeting={showDestinationTheming ? destinationCopy.aiGreeting : undefined}
      >
        {sectionContent}
      </WorkspaceShell>

      {/* Activity modal */}
      {modal && (
        <ActivityModal
          data={modal}
          currency={trip.currency}
          onClose={() => setModal(null)}
          onAdd={editor.addActivity}
          onEdit={editor.editActivity}
          onAddNote={editor.addNote}
          onEditNote={editor.editNote}
          onDeleteNote={editor.deleteNote}
        />
      )}

      {/* Confirm delete activity */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete activity?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Reset demo trip */}
      <ConfirmDialog
        isOpen={resetConfirm}
        title="Reset demo trip?"
        message={resetError ?? `This will delete all your current demo edits and restore the original ${trip.destination} itinerary. This cannot be undone.`}
        confirmLabel="Reset"
        destructive
        onConfirm={handleResetDemo}
        onCancel={() => { setResetConfirm(false); setResetError(null); }}
      />

      {/* Move to day picker */}
      {moveActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMoveActivityId(null)} />
          <div ref={moveDialogRef} className="relative w-full max-w-sm card p-5 animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title">
            <h3 id="move-dialog-title" className="font-display text-base font-700 text-ink-900 mb-3">Move activity to</h3>
            <div className="space-y-2">
              {trip.days.map((d) => (
                <button
                  key={d.id}
                  onClick={() => executeMoveToDay(d.id)}
                  className="w-full rounded-xl border border-glass/10 bg-ink-200/40 px-4 py-2.5 text-left text-sm font-600 text-ink-700 hover:bg-ink-300/60 hover:border-glass/20 transition"
                >
                  {d.label}
                  {d.theme ? ` — ${d.theme}` : ''}
                  <span className="float-right text-ink-500 font-normal">
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              ))}
            </div>
            <button onClick={() => setMoveActivityId(null)} className="btn-ghost w-full mt-3">Cancel</button>
          </div>
        </div>
      )}

      {/* AI Change Review */}
      {reviewProposal && (
        <AIChangeReview
          proposal={reviewProposal}
          tripId={tripId}
          days={trip.days}
          currency={trip.currency}
          onApplied={handleRevisionApplied}
          onClose={() => setReviewProposal(null)}
        />
      )}
    </DestinationThemeScope>
  );
}
