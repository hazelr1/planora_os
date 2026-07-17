import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarPlus, CalendarMinus, CheckCircle2, CheckCircle, ChevronDown, ChevronUp,
  Lock, Loader2, Minus, Plus, RefreshCw, Send, Sparkles, X, XCircle,
} from 'lucide-react';
import type { AIRevisionProposal, Day, RevisionChange, RevisionOperation } from '../types';
import { revisionRepository } from '../data';
import { supabase } from '../lib/supabase';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AIChangeReviewProps {
  proposal: AIRevisionProposal;
  tripId: string;
  days: Day[];
  currency: string;
  onApplied: () => void;
  onClose: () => void;
}

// ─── Operation display config ─────────────────────────────────────────────────

const opCfg: Record<RevisionOperation, { label: string; bg: string; text: string; border: string; Icon: React.ElementType }> = {
  add:     { label: 'Add',     bg: 'bg-emerald-500/10', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-500/20', Icon: Plus },
  remove:  { label: 'Remove',  bg: 'bg-rose-500/10',    text: 'text-rose-800 dark:text-rose-300',    border: 'border-rose-500/20',    Icon: Minus },
  replace: { label: 'Replace', bg: 'bg-amber-500/10',   text: 'text-amber-800 dark:text-amber-300',   border: 'border-amber-500/20',   Icon: RefreshCw },
  move:    { label: 'Move',    bg: 'bg-sky-500/10',     text: 'text-sky-800 dark:text-sky-300',     border: 'border-sky-500/20',     Icon: ArrowRight },
  update:  { label: 'Update',  bg: 'bg-violet-500/10',  text: 'text-violet-300',  border: 'border-violet-500/20',  Icon: RefreshCw },
  add_day:    { label: 'Add day',    bg: 'bg-emerald-500/10', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-500/20', Icon: CalendarPlus },
  remove_day: { label: 'Remove day', bg: 'bg-rose-500/10',    text: 'text-rose-800 dark:text-rose-300',    border: 'border-rose-500/20',    Icon: CalendarMinus },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(dayId: string, days: Day[]): string {
  if (!dayId) return '';
  return days.find((d) => d.id === dayId)?.label ?? dayId.slice(0, 8);
}

function fmt(n: number, currency: string): string {
  return `${currency} ${Math.abs(Math.round(n)).toLocaleString()}`;
}

// ─── Change card ─────────────────────────────────────────────────────────────

function ChangeCard({ change, days, currency }: { change: RevisionChange; days: Day[]; currency: string }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = opCfg[change.operation] ?? opCfg.update;
  const { Icon } = cfg;

  const srcLabel = dayLabel(change.source_day_id, days);
  const dstLabel = dayLabel(change.destination_day_id, days);

  const actName =
    change.operation === 'add' ? change.after.title :
    change.operation === 'add_day' ? (change.day_theme || 'New day') :
    change.operation === 'remove_day' ? (srcLabel || 'This day') :
    (change.before.title || change.after.title);
  const hasDetail =
    (change.operation === 'replace' && change.before.title) ||
    (change.operation === 'update') ||
    (change.operation === 'add' && (change.after.location || change.after.duration_minutes > 0)) ||
    (change.operation === 'add_day' && change.day_activities.length > 0);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg}`}>
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start gap-3"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        aria-expanded={hasDetail ? expanded : undefined}
      >
        <span className={`mt-0.5 rounded-lg p-1.5 border ${cfg.border} ${cfg.bg} shrink-0`}>
          <Icon size={12} className={cfg.text} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className={`text-xs font-700 uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
            {actName && <span className="text-sm font-600 text-ink-900 truncate max-w-[200px]">{actName}</span>}
            {change.operation === 'move' && srcLabel && dstLabel && (
              <span className="flex items-center gap-1 text-xs text-ink-600">
                {srcLabel} <ArrowRight size={10} /> {dstLabel}
              </span>
            )}
            {change.operation !== 'move' && change.operation !== 'remove_day' && srcLabel && (
              <span className={`text-xs opacity-60 ${cfg.text}`}>{srcLabel}</span>
            )}
            {change.operation === 'add' && dstLabel && (
              <span className={`text-xs opacity-60 ${cfg.text}`}>→ {dstLabel}</span>
            )}
          </div>
          <p className={`text-xs leading-relaxed mt-1 ${cfg.text} opacity-80`}>{change.reason}</p>
        </div>
        {hasDetail && (
          <span className={`shrink-0 mt-0.5 ${cfg.text} opacity-60`}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        )}
      </button>

      {expanded && hasDetail && (
        <div className={`px-4 pb-3 border-t ${cfg.border} pt-3 space-y-2`}>
          {/* Replace: before → after */}
          {change.operation === 'replace' && change.before.title && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-600 text-ink-600 mb-1">Before</p>
                <p className="text-ink-700 line-through opacity-60">{change.before.title}</p>
                {change.before.estimated_cost > 0 && (
                  <p className="text-ink-600 opacity-60">{fmt(change.before.estimated_cost, currency)}</p>
                )}
              </div>
              <div>
                <p className="font-600 text-ink-600 mb-1">After</p>
                <p className="text-ink-700">{change.after.title}</p>
                {change.after.location && <p className="text-ink-600">{change.after.location}</p>}
                {change.after.estimated_cost >= 0 && (
                  <p className="text-ink-600">{fmt(change.after.estimated_cost, currency)}</p>
                )}
              </div>
            </div>
          )}

          {/* Update: show changed fields */}
          {change.operation === 'update' && (
            <div className="text-xs space-y-1.5">
              {change.before.title && change.after.title && change.before.title !== change.after.title && (
                <div className="flex items-center gap-2">
                  <span className="text-ink-600 shrink-0 w-12">Title</span>
                  <span className="line-through text-ink-600">{change.before.title}</span>
                  <ArrowRight size={10} className="text-ink-600 shrink-0" />
                  <span className="text-ink-700">{change.after.title}</span>
                </div>
              )}
              {change.before.estimated_cost !== change.after.estimated_cost && change.after.estimated_cost >= 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-ink-600 shrink-0 w-12">Cost</span>
                  <span className="line-through text-ink-600">{fmt(change.before.estimated_cost, currency)}</span>
                  <ArrowRight size={10} className="text-ink-600 shrink-0" />
                  <span className="text-ink-700">{fmt(change.after.estimated_cost, currency)}</span>
                </div>
              )}
              {change.before.duration_minutes !== change.after.duration_minutes && change.after.duration_minutes > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-ink-600 shrink-0 w-12">Time</span>
                  <span className="line-through text-ink-600">{change.before.duration_minutes}min</span>
                  <ArrowRight size={10} className="text-ink-600 shrink-0" />
                  <span className="text-ink-700">{change.after.duration_minutes}min</span>
                </div>
              )}
            </div>
          )}

          {/* Add: show new activity details */}
          {change.operation === 'add' && (
            <div className="text-xs space-y-0.5 text-ink-600">
              {change.after.location && <p>{change.after.location}</p>}
              {change.after.duration_minutes > 0 && (
                <p>{change.after.duration_minutes}min · {fmt(change.after.estimated_cost, currency)}</p>
              )}
              {change.after.description && <p className="text-ink-600 leading-relaxed">{change.after.description}</p>}
            </div>
          )}

          {/* Add day: list the new day's starting activities */}
          {change.operation === 'add_day' && (
            <div className="text-xs space-y-1.5">
              {change.day_summary && <p className="text-ink-600 leading-relaxed">{change.day_summary}</p>}
              {change.day_activities.map((act, i) => (
                <div key={i} className="flex items-center gap-2 text-ink-700">
                  <span className="text-ink-600 shrink-0">{act.start_time || '—'}</span>
                  <span className="truncate">{act.title}</span>
                  {act.estimated_cost > 0 && (
                    <span className="text-ink-600 shrink-0 ml-auto">{fmt(act.estimated_cost, currency)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIChangeReview({ proposal: initialProposal, tripId, days, currency, onApplied, onClose }: AIChangeReviewProps) {
  const [currentProposal, setCurrentProposal] = useState(initialProposal);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [tryMode, setTryMode] = useState(false);
  const [refinement, setRefinement] = useState(initialProposal.instruction);
  const [tryStatus, setTryStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [tryError, setTryError] = useState<string | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Traps Tab within the dialog and restores focus on close, in addition to
  // the close-button focus this already had.
  useFocusTrap(containerRef, true, closeRef);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top when proposal updates
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentProposal.revisionId]);

  const p = currentProposal;
  const lockedCount = days.reduce((n, d) => n + d.activities.filter((a) => a.locked).length, 0);
  const budgetDiff = p.budget_difference;
  const budgetColor = budgetDiff < 0 ? 'text-emerald-800 dark:text-emerald-300' : budgetDiff > 0 ? 'text-rose-800 dark:text-rose-400' : 'text-ink-600';
  const budgetSign = budgetDiff > 0 ? '+' : budgetDiff < 0 ? '' : '';

  // ── Cancel (reject + close) ─────────────────────────────────────────────────
  const handleCancel = async () => {
    if (p.revisionId) {
      await revisionRepository.rejectRevision(p.revisionId);
    }
    onClose();
  };

  // ── Apply changes ───────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!p.revisionId) {
      setApplyError('This proposal was not saved and cannot be applied. Try requesting a new one.');
      setApplyStatus('error');
      return;
    }
    setApplyStatus('loading');
    setApplyError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setApplyError('Session expired. Please sign in again.'); setApplyStatus('error'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-itinerary-revision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ revision_id: p.revisionId }),
          signal: AbortSignal.timeout(30_000),
        },
      );
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        setApplyError(json.error ?? 'Could not apply changes. Please try again.');
        setApplyStatus('error');
        return;
      }
      // Close unconditionally on success rather than leaving it entirely to
      // the caller's onApplied — that made this dialog's closing dependent
      // on every future onApplied implementation remembering to also clear
      // whatever state renders it, the same shape of bug as onClose/onCancel
      // above.
      onApplied();
      onClose();
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setApplyError(isTimeout ? 'The request timed out. Please try again.' : 'Something went wrong. Check your connection.');
      setApplyStatus('error');
    }
  };

  // ── Try another proposal ────────────────────────────────────────────────────
  const handleTryAnother = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = refinement.trim();
    if (!text) return;

    setTryStatus('loading');
    setTryError(null);

    // Reject the current revision before making a new one
    if (p.revisionId) {
      await revisionRepository.rejectRevision(p.revisionId);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setTryError('Session expired. Please sign in again.'); setTryStatus('error'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revise-itinerary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ trip_id: tripId, instruction: text }),
          signal: AbortSignal.timeout(60_000),
        },
      );
      const json = await res.json() as AIRevisionProposal & { error?: string };
      if (!res.ok || json.error) {
        setTryError(json.error ?? 'Could not generate a new proposal. Please try again.');
        setTryStatus('error');
        return;
      }

      setCurrentProposal({ ...json, instruction: text });
      setTryMode(false);
      setTryStatus('idle');
      setApplyStatus('idle');
      setApplyError(null);
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setTryError(isTimeout ? 'The request timed out. Please try again.' : 'Something went wrong. Check your connection.');
      setTryStatus('error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} aria-hidden="true" />

      <div ref={containerRef} className="relative w-full sm:max-w-xl max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl ai-surface shadow-pop animate-scale-in overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-violet-400/15 shrink-0">
          <div className="h-9 w-9 rounded-xl ai-gradient flex items-center justify-center shrink-0 mt-0.5 shadow-soft">
            <Sparkles className="text-white" size={17} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="review-title" className="font-display text-base font-700 text-ink-900">AI Change Review</h2>
            <p className="text-xs text-ink-600 mt-0.5">Nothing is applied until you click Apply Changes</p>
          </div>
          <button
            ref={closeRef}
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition shrink-0"
            aria-label="Close review"
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 px-5 py-4 space-y-5" role="region" aria-label="Proposal details">

          {/* User request */}
          <div>
            <p className="text-xs font-700 uppercase tracking-wide text-ink-600 mb-1.5">Your request</p>
            <p className="text-sm text-ink-700 bg-ink-200/40 rounded-xl px-3.5 py-2.5 border border-glass/10 leading-relaxed italic">
              "{p.instruction}"
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-violet-500/10 px-4 py-3">
            <p className="text-sm text-violet-100 leading-relaxed">{p.summary}</p>
          </div>

          {/* Constraints */}
          {p.constraints.length > 0 && (
            <div>
              <p className="text-xs font-700 uppercase tracking-wide text-ink-600 mb-2">Constraints</p>
              <div className="space-y-2" role="list">
                {p.constraints.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5" role="listitem">
                    {c.satisfied
                      ? <CheckCircle2 size={15} className="text-emerald-800 dark:text-emerald-400 mt-0.5 shrink-0" aria-label="Satisfied" />
                      : <XCircle size={15} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" aria-label="Not satisfied" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-600 text-ink-800">{c.constraint}</p>
                      <p className="text-xs text-ink-600 mt-0.5 leading-relaxed">{c.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget impact */}
          <div>
            <p className="text-xs font-700 uppercase tracking-wide text-ink-600 mb-2">Budget impact</p>
            <div className="rounded-xl border border-glass/10 bg-ink-200/40 grid grid-cols-3 divide-x divide-glass/10 text-center text-sm">
              <div className="px-3 py-3">
                <p className="text-xs text-ink-600 mb-0.5">Current</p>
                <p className="font-700 text-ink-800">{fmt(p.old_estimated_total, currency)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-ink-600 mb-0.5">Proposed</p>
                <p className="font-700 text-ink-800">{fmt(p.new_estimated_total, currency)}</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-xs text-ink-600 mb-0.5">Difference</p>
                <p className={`font-700 ${budgetColor}`}>
                  {budgetDiff === 0 ? 'None' : `${budgetSign}${fmt(budgetDiff, currency)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Pace effect */}
          {p.pace_effect && (
            <p className="text-xs text-ink-600 italic leading-relaxed">{p.pace_effect}</p>
          )}

          {/* Proposed changes */}
          <div>
            <p className="text-xs font-700 uppercase tracking-wide text-ink-600 mb-2">
              Proposed changes{p.changes.length > 0 ? ` (${p.changes.length})` : ''}
            </p>
            {p.changes.length > 0 ? (
              <div className="space-y-2" role="list">
                {p.changes.map((change, i) => (
                  <div key={i} role="listitem">
                    <ChangeCard change={change} days={days} currency={currency} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-glass/10 bg-ink-200/40 px-4 py-6 text-center">
                <p className="text-sm text-ink-600">No changes proposed for this instruction.</p>
              </div>
            )}
          </div>

          {/* Locked activities preserved */}
          <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 px-4 py-3">
            <Lock size={14} className="text-emerald-800 dark:text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              {lockedCount > 0
                ? `${lockedCount} locked ${lockedCount === 1 ? 'activity' : 'activities'} preserved — they were not edited, moved, or removed.`
                : 'No locked activities in this trip. Lock important activities to protect them from future AI changes.'}
            </p>
          </div>

          {/* Warnings */}
          {p.warnings.length > 0 && (
            <div className="rounded-xl bg-amber-500/10 px-4 py-3 flex items-start gap-2.5" role="alert">
              <AlertTriangle size={15} className="text-amber-800 dark:text-amber-400 mt-0.5 shrink-0" />
              <ul className="space-y-1">
                {p.warnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply error */}
          {applyStatus === 'error' && applyError && (
            <div className="rounded-xl bg-rose-500/10 px-4 py-3 flex items-start gap-2.5" role="alert">
              <AlertTriangle size={15} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">{applyError}</p>
            </div>
          )}

          {/* Try another inline panel */}
          {tryMode && (
            <div className="rounded-xl bg-violet-500/5 p-4">
              <p className="text-sm font-600 text-ink-800 mb-3">Describe what you'd like instead</p>
              {tryStatus === 'error' && tryError && (
                <div className="rounded-lg bg-rose-500/10 px-3 py-2 mb-3 flex items-start gap-2" role="alert">
                  <AlertTriangle size={13} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 dark:text-rose-300">{tryError}</p>
                </div>
              )}
              <form onSubmit={handleTryAnother} className="space-y-3">
                <textarea
                  className="input min-h-[72px] resize-none text-sm"
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  disabled={tryStatus === 'loading'}
                  aria-label="Refined instruction"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1 text-sm"
                    onClick={() => { setTryMode(false); setTryStatus('idle'); setTryError(null); }}
                    disabled={tryStatus === 'loading'}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 text-sm"
                    disabled={!refinement.trim() || tryStatus === 'loading'}
                  >
                    {tryStatus === 'loading'
                      ? <><Loader2 size={13} className="animate-spin" /> Analyzing…</>
                      : <><Send size={13} /> Request new proposal</>
                    }
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!tryMode && (
          <div className="shrink-0 px-5 py-4 border-t border-violet-400/15 bg-ink-100/40">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCancel}
                className="btn-ghost sm:flex-1 text-sm"
                disabled={applyStatus === 'loading'}
              >
                Cancel
              </button>
              <button
                onClick={() => { setTryMode(true); setRefinement(p.instruction); }}
                className="btn-ghost sm:flex-1 text-sm"
                disabled={applyStatus === 'loading'}
              >
                Try another proposal
              </button>
              <button
                onClick={handleApply}
                className="btn-primary sm:flex-1 text-sm"
                disabled={applyStatus === 'loading' || !p.revisionId}
              >
                {applyStatus === 'loading'
                  ? <><Loader2 size={13} className="animate-spin" /> Applying…</>
                  : <><CheckCircle size={13} /> Apply changes</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
