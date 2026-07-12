import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, FlaskConical, Gauge, Loader2, MapPin, Pencil, RefreshCw, Save, Users } from 'lucide-react';
import type { AIRevisionProposal, Screen, Trip } from '../types';
import DaySection from '../components/DaySection';
import BudgetSummary from '../components/BudgetSummary';
import AIAssistantPanel from '../components/AIAssistantPanel';
import AIChangeReview from '../components/AIChangeReview';
import ActivityModal, { type ActivityModalData } from '../components/ActivityModal';
import ConfirmDialog from '../components/ConfirmDialog';
import TripEditModal from '../components/TripEditModal';
import EmptyState from '../components/EmptyState';
import { useActivityEditor } from '../hooks/useActivityEditor';
import { useSaveStatus } from '../hooks/useSaveStatus';
import { tripRepository } from '../data';
import { supabase } from '../lib/supabase';
import { isOverBudget } from '../utils/budget';
import { formatDateRange } from '../utils/dates';

interface WorkspaceProps {
  tripId: string;
  onNavigate: (screen: Screen) => void;
  onUpdateTripFields: (id: string, fields: { title?: string; budget?: number; currency?: string }) => Promise<void>;
}

type LoadStatus = 'loading' | 'ready' | 'error' | 'not_found';

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

export default function Workspace({ tripId, onNavigate, onUpdateTripFields }: WorkspaceProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [activeDay, setActiveDay] = useState(0);
  const [modal, setModal] = useState<ActivityModalData | null>(null);
  const [moveActivityId, setMoveActivityId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState(false);
  const [reviewProposal, setReviewProposal] = useState<AIRevisionProposal | null>(null);
  const [showAppliedBanner, setShowAppliedBanner] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const { status: saveStatus, errorMessage, track, retry } = useSaveStatus();

  const setTripSafe = useCallback((t: Trip) => setTrip(t), []);
  const editor = useActivityEditor(trip ?? ({} as Trip), setTripSafe, track);

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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-9 w-9 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
        <p className="text-sm text-ink-600">Loading itinerary…</p>
      </div>
    );
  }

  if (loadStatus === 'not_found') {
    return (
      <div className="card p-12 text-center">
        <p className="text-base font-600 text-ink-800 mb-1">Trip not found</p>
        <p className="text-sm text-ink-600 mb-6">This trip may have been deleted.</p>
        <button onClick={() => onNavigate({ name: 'trips' })} className="btn-primary">
          Back to My Trips
        </button>
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="card p-12 text-center">
        <AlertTriangle size={24} className="text-rose-400 mx-auto mb-3" />
        <p className="text-base font-600 text-ink-800 mb-1">Could not load this trip</p>
        <p className="text-sm text-ink-600 mb-6">Please check your connection and try again.</p>
        <button onClick={load} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (!trip) return null;

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const over = isOverBudget(trip);

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

  const handleTripEdit = (title: string, budget: number, currency: string) => {
    const prev = trip;
    setTrip({ ...trip, title, budget, currency });
    void track(async () => {
      try {
        await onUpdateTripFields(trip.id, { title, budget, currency });
      } catch {
        setTrip(prev);
        throw new Error('Failed to save trip changes.');
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Trip header */}
      <div>
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
                onClick={() => setEditingTrip(true)}
                className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-white/5 transition"
                aria-label="Edit trip"
              >
                <Pencil size={16} />
              </button>
              {trip.isDemo && (
                <button
                  onClick={() => setResetConfirm(true)}
                  disabled={resetLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-600 text-ink-500 hover:text-ink-800 hover:bg-white/5 border border-white/10 transition"
                  title="Reset demo trip to original state"
                >
                  {resetLoading
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />
                  }
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
      </div>

      {/* Changes applied banner */}
      {showAppliedBanner && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 flex items-center gap-2.5" role="status">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">Changes applied. Your itinerary has been updated.</p>
        </div>
      )}

      {/* Over-budget warning */}
      {over && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 flex items-center gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 shrink-0" />
          <p className="text-sm text-rose-300 font-medium">
            Your itinerary currently exceeds the trip budget. Consider locking must-dos and asking the AI to trim costs.
          </p>
        </div>
      )}

      {/* Day tabs */}
      {trip.days.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {trip.days.map((d, i) => (
            <button
              key={d.id}
              onClick={() => setActiveDay(i)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-600 transition ${
                activeDay === i
                  ? 'bg-brand-500 text-ink-950 shadow-soft'
                  : 'bg-ink-200/60 border border-white/10 text-ink-600 hover:bg-ink-300/60'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {trip.days.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Calendar size={22} />}
                title="No days in this trip"
                description="This trip has no itinerary days. Try creating a new trip with a valid date range."
              />
            </div>
          ) : (
            <DaySection
              day={trip.days[activeDay]}
              onAddActivity={openAdd}
              onEditActivity={openEdit}
              onDeleteActivity={(id) => setConfirmDeleteId(id)}
              onMoveToDayActivity={setMoveActivityId}
              onMoveUpActivity={editor.moveUp}
              onMoveDownActivity={editor.moveDown}
              onToggleLock={editor.toggleLock}
            />
          )}
        </div>
        <div className="space-y-5">
          <BudgetSummary trip={trip} />
          <AIAssistantPanel
            trip={trip}
            onRevisionProposed={setReviewProposal}
          />
        </div>
      </div>

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
        message={resetError ?? "This will delete all your current demo edits and restore the original Tokyo itinerary. This cannot be undone."}
        confirmLabel="Reset"
        destructive
        onConfirm={handleResetDemo}
        onCancel={() => { setResetConfirm(false); setResetError(null); }}
      />

      {/* Move to day picker */}
      {moveActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setMoveActivityId(null)} />
          <div className="relative w-full max-w-sm card p-5 animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="move-dialog-title">
            <h3 id="move-dialog-title" className="font-display text-base font-700 text-ink-900 mb-3">Move activity to</h3>
            <div className="space-y-2">
              {trip.days.map((d) => (
                <button
                  key={d.id}
                  onClick={() => executeMoveToDay(d.id)}
                  className="w-full rounded-xl border border-white/10 bg-ink-200/40 px-4 py-2.5 text-left text-sm font-600 text-ink-700 hover:bg-ink-300/60 hover:border-white/20 transition"
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

      {/* Trip edit modal */}
      {editingTrip && (
        <TripEditModal
          trip={trip}
          onSave={(title, budget, currency) => {
            setEditingTrip(false);
            handleTripEdit(title, budget, currency);
          }}
          onClose={() => setEditingTrip(false)}
        />
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
    </div>
  );
}
