import { useState } from 'react';
import { AlertTriangle, Bot, Loader2, Send, Zap } from 'lucide-react';
import type { AIRevisionProposal, Trip } from '../types';
import { supabase } from '../lib/supabase';

interface AIAssistantPanelProps {
  trip: Trip;
  onRevisionProposed: (proposal: AIRevisionProposal) => void;
}

const SUGGESTION_CHIPS = [
  'Make this trip cheaper',
  'Make tomorrow less busy',
  'Add more local food experiences',
  'Swap lunch for something vegetarian',
  'Find a hidden gem nearby',
];

const DEMO_CHIPS = [
  'Make this trip cheaper',
  'Make Day 3 less busy',
  'Replace outdoor activities',
];

type PanelStatus = 'idle' | 'analyzing' | 'error';

export default function AIAssistantPanel({ trip, onRevisionProposed }: AIAssistantPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = instruction.trim().length > 0 && status !== 'analyzing';

  const submitInstruction = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === 'analyzing') return;

    setInstruction(trimmed);
    setStatus('analyzing');
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Your session has expired. Please sign in again.');
        setStatus('error');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revise-itinerary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ trip_id: trip.id, instruction: trimmed }),
          signal: AbortSignal.timeout(60_000),
        },
      );

      const json = await response.json() as AIRevisionProposal & { error?: string };

      if (!response.ok || json.error) {
        setErrorMessage(json.error ?? 'Could not generate a revision. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('idle');
      setInstruction('');
      onRevisionProposed({ ...json, instruction: trimmed });
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setErrorMessage(
        isTimeout
          ? 'The request timed out. Please try again.'
          : 'Something went wrong. Please check your connection.',
      );
      setStatus('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitInstruction(instruction);
  };

  const handleChipClick = (chip: string) => {
    if (trip.isDemo) {
      // Demo chips submit immediately — no need to press Send
      void submitInstruction(chip);
    } else {
      setInstruction(chip);
    }
  };

  const chips = trip.isDemo ? DEMO_CHIPS : SUGGESTION_CHIPS;

  return (
    <div className="ai-surface p-5 sticky top-20">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl ai-gradient flex items-center justify-center shrink-0 shadow-soft">
          <Bot className="text-white" size={18} />
        </div>
        <div>
          <h3 className="font-display text-base font-700 text-ink-900">AI Assistant</h3>
          <p className="text-xs text-ink-600">Ask for itinerary changes</p>
        </div>
      </div>

      {/* Analyzing state */}
      {status === 'analyzing' && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-400/20 px-3.5 py-3 flex items-center gap-2.5 mb-4">
          <Loader2 size={14} className="text-violet-300 shrink-0 animate-spin" />
          <p className="text-xs text-violet-200 leading-relaxed font-medium">
            Analyzing itinerary and constraints…
          </p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-3 flex items-start gap-2 mb-4">
          <AlertTriangle size={14} className="text-rose-400 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-300 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Quick request chips */}
      {status !== 'analyzing' && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">
            {trip.isDemo
              ? <span className="flex items-center gap-1"><Zap size={11} className="text-amber-400" /> Quick requests</span>
              : 'Try asking'
            }
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`chip transition-colors border ${
                  trip.isDemo
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/30'
                    : 'bg-ink-200/40 text-ink-600 border-white/10 hover:bg-violet-500/10 hover:text-violet-200 hover:border-violet-400/20'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          {trip.isDemo && (
            <p className="text-[10px] text-ink-600 mt-1.5">Tap a chip to instantly request a real AI revision.</p>
          )}
        </div>
      )}

      {/* Input form */}
      <form className="mt-3" onSubmit={handleSubmit}>
        <label htmlFor="ai-input" className="sr-only">Ask the AI assistant</label>
        <textarea
          id="ai-input"
          className="input min-h-[72px] resize-none"
          placeholder="Describe what you'd like to change…"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={status === 'analyzing'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submitInstruction(instruction);
          }}
        />
        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={!canSubmit}
        >
          {status === 'analyzing'
            ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
            : <><Send size={14} /> Send</>
          }
        </button>
      </form>

      {/* Demo note */}
      {trip.isDemo && status === 'idle' && (
        <p className="mt-3 text-[10px] text-ink-600 text-center leading-relaxed">
          This is a demo trip. Changes are saved to your isolated session.
        </p>
      )}
    </div>
  );
}
