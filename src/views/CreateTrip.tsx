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

const PROGRESS_MESSAGES = [
  'Studying your destination…',
  'Mapping out the perfect days…',
  'Selecting activities that match your style…',
  'Calculating estimated costs…',
  'Putting the finishing touches on your itinerary…',
];

export default function CreateTrip({ onNavigate, onCreate }: CreateTripProps) {
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedValues, setSavedValues] = useState<TripFormValues | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const startProgress = () => {
    setProgressIndex(0);
    return setInterval(() => {
      setProgressIndex((i) => i + 1);
    }, 3000);
  };

  const stopProgress = (id: ReturnType<typeof setInterval>) => {
    clearInterval(id);
  };

  const handleSubmit = async (values: TripFormValues) => {
    if (status === 'generating') return;

    setSavedValues(values);
    setErrorMessage(null);
    setWarnings([]);
    setStatus('generating');

    const pid = startProgress();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        stopProgress(pid);
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

      stopProgress(pid);

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
      stopProgress(pid);
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

  const progressMessage = PROGRESS_MESSAGES[progressIndex % PROGRESS_MESSAGES.length];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-800 text-ink-900">Create a trip</h1>
        <p className="text-ink-600 mt-1">Fill in the details and AI will build your day-by-day itinerary.</p>
      </div>

      {/* Generating overlay */}
      {status === 'generating' && (
        <div className="card p-8 mb-6 flex flex-col items-center text-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
            <Sparkles size={20} className="absolute text-brand-400" />
          </div>
          <div>
            <p className="font-display font-700 text-ink-900 text-base">Generating your itinerary</p>
            <p className="text-sm text-ink-600 mt-1 min-h-[1.25rem] transition-all">
              {progressMessage}
            </p>
          </div>
          <p className="text-xs text-ink-600">This usually takes 15–30 seconds.</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 mb-5 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-300 font-medium">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="text-sm text-rose-300 underline underline-offset-2 hover:no-underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Partial-save warnings (non-blocking) */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 mb-5">
          <p className="text-sm text-amber-300 font-medium mb-1">Some items could not be saved:</p>
          <ul className="text-sm text-amber-300/80 space-y-0.5 list-disc list-inside">
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
