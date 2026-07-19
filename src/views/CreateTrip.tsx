import { useState } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import type { Screen } from '../types';
import TripForm, { type TripFormValues } from '../components/TripForm';
import { supabase } from '../lib/supabase';

interface CreateTripProps {
  onNavigate: (screen: Screen) => void;
  onCreate: (tripId: string) => void;
}

type GenerateStatus = 'idle' | 'generating' | 'error';

export default function CreateTrip({ onNavigate, onCreate }: CreateTripProps) {
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedValues, setSavedValues] = useState<TripFormValues | null>(null);

  const handleSubmit = async (values: TripFormValues) => {
    if (status === 'generating') return;

    setSavedValues(values);
    setErrorMessage(null);
    setWarnings([]);
    setStatus('generating');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Your session has expired. Please sign in again.');
        setStatus('error');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-itinerary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            destination: values.destination,
            start_date: values.startDate,
            end_date: values.endDate,
            budget: values.budget,
            currency: values.currency,
            travelers: values.travelers,
            travel_pace: values.pace,
            interests: values.interests,
            special_requests: values.specialRequests,
          }),
          signal: AbortSignal.timeout(90_000),
        },
      );

      const json = await response.json() as { tripId?: string; warnings?: string[]; error?: string };

      if (!response.ok || !json.tripId) {
        setErrorMessage(json.error ?? 'Could not generate your itinerary. Please try again.');
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

  const handleRetry = () => {
    if (savedValues) void handleSubmit(savedValues);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="font-display text-xl font-700 text-ink-900">Create a trip</h1>
        <p className="text-ink-600 mt-0.5 text-sm">Fill in the details and AI will build your day-by-day itinerary.</p>
      </div>

      {/* Generating overlay */}
      {status === 'generating' && (
        <div className="ai-surface p-6 mb-5 flex flex-col items-center text-center gap-4 animate-scale-in" role="status" aria-live="polite" aria-label="Generating itinerary">
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-400/20 border-t-violet-400 animate-spin" />
            <div className="absolute inset-0 rounded-full animate-float">
              <Sparkles size={20} className="absolute inset-0 m-auto text-violet-300" />
            </div>
          </div>
          <div>
            <p className="font-display font-600 text-ink-900 text-sm">Generating your itinerary</p>
            <p className="text-sm text-ink-600 mt-1">This usually takes 15–30 seconds.</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl bg-rose-500/10 px-3.5 py-2.5 mb-4 flex items-start gap-2" role="alert">
          <AlertTriangle size={16} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-800 dark:text-rose-300 font-medium whitespace-pre-line">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-rose-800 dark:text-rose-300 underline underline-offset-2 hover:no-underline mt-1"
            >
              Try again
            </button>
          </div>
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
      {status !== 'generating' && (
        <div className="card p-6 sm:p-8">
          <TripForm
            onSubmit={handleSubmit}
            onCancel={() => onNavigate({ name: 'trips' })}
            submitLabel={status === 'error' ? 'Retry Generation' : 'Generate Itinerary'}
          />
        </div>
      )}
    </div>
  );
}
