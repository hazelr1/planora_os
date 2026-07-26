import { useEffect, useState } from 'react';
import { AlertTriangle, Sparkles, ClipboardList } from 'lucide-react';
import type { Screen } from '../types';
import { supabase } from '../lib/supabase';
import { profileRepository, type TripPreferenceTags } from '../data';
import PreferencesBadge from '../components/PreferencesBadge';

interface PasteTripProps {
  onNavigate: (screen: Screen) => void;
  onCreate: (tripId: string) => void;
}

type BuildStatus = 'idle' | 'building' | 'error';

const MAX_CHARS = 4000;

const PLACEHOLDER = `e.g. "3 days in Lisbon: Time Out Market, LX Factory, Belem Tower, pastel de nata at Manteigaria, sunset at Miradouro da Senhora do Monte, day trip to Sintra..."`;

/**
 * Alternate entry point to CreateTrip's own form — paste unstructured text
 * (a reel caption, a scrawled list of places, anything) instead of filling
 * in destination/dates/budget by hand. The server does the work of reading
 * the text and turning it into the same kind of day-by-day trip the form
 * produces (see generate-trip-from-text); this view only owns the
 * paste/submit/generating/error loop, mirroring CreateTrip's shape.
 */
export default function PasteTrip({ onNavigate, onCreate }: PasteTripProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<BuildStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preferenceTags, setPreferenceTags] = useState<TripPreferenceTags | null>(null);

  // Read-only, best-effort — see the identical effect in CreateTrip.tsx.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await profileRepository.getProfile(user.id);
      if (!cancelled && result.ok && Object.keys(result.data.preferences).length > 0) {
        setPreferenceTags(result.data.preferences);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pastedText = text.trim();
    if (status === 'building' || !pastedText) return;

    setErrorMessage(null);
    setWarnings([]);
    setStatus('building');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Your session has expired. Please sign in again.');
        setStatus('error');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-trip-from-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ pasted_text: pastedText }),
          // Two sequential AI calls (extract, then structure) plus
          // persistence — same generous ceiling CreateTrip gives its own
          // single-call generation.
          signal: AbortSignal.timeout(90_000),
        },
      );

      const json = await response.json() as { tripId?: string; warnings?: string[]; error?: string };

      if (!response.ok || !json.tripId) {
        setErrorMessage(json.error ?? 'Could not build a trip from that text. Please try again.');
        setStatus('error');
        return;
      }

      if (json.warnings && json.warnings.length > 0) {
        setWarnings(json.warnings);
      }

      onCreate(json.tripId);
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setErrorMessage(
        isTimeout
          ? 'The request timed out. Please try again.'
          : 'Something went wrong. Please check your connection and try again.',
      );
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="font-display text-xl font-700 text-ink-900">Paste a trip idea</h1>
          {preferenceTags && <PreferencesBadge tags={preferenceTags} />}
        </div>
        <p className="text-ink-600 mt-0.5 text-sm">
          Drop in a reel caption, a list of places, or anything else describing a trip — AI pulls out the destination and places, then builds a day-by-day itinerary.
        </p>
      </div>

      {/* Building overlay */}
      {status === 'building' && (
        <div className="ai-surface p-6 mb-5 flex flex-col items-center text-center gap-4 animate-scale-in" role="status" aria-live="polite" aria-label="Building your trip">
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-400/20 border-t-violet-400 animate-spin" />
            <div className="absolute inset-0 rounded-full animate-float">
              <Sparkles size={20} className="absolute inset-0 m-auto text-violet-300" />
            </div>
          </div>
          <div>
            <p className="font-display font-600 text-ink-900 text-sm">Reading your text and building a trip</p>
            <p className="text-sm text-ink-600 mt-1">This usually takes 20–40 seconds.</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 mb-4 flex items-start gap-2" role="alert">
          <AlertTriangle size={16} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-800 dark:text-rose-300 font-medium whitespace-pre-line flex-1">{errorMessage}</p>
        </div>
      )}

      {/* Partial-save warnings (non-blocking) */}
      {warnings.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 mb-5">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">Some items could not be saved:</p>
          <ul className="text-sm text-amber-800 dark:text-amber-300/80 space-y-0.5 list-disc list-inside">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Form */}
      {status !== 'building' && (
        <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
          <label htmlFor="paste-trip-text" className="label">Your trip idea</label>
          <textarea
            id="paste-trip-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={10}
            placeholder={PLACEHOLDER}
            className="input min-h-[220px] resize-y"
          />
          <div className="mt-1 text-right text-xs text-ink-500">{text.length}/{MAX_CHARS}</div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => onNavigate({ name: 'create' })}>
              Use the form instead
            </button>
            <button type="submit" className="btn-primary" disabled={!text.trim()}>
              <ClipboardList size={15} /> Build my trip
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
