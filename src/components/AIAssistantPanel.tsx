import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Check, Loader2, Send, Sparkles, User, Zap } from 'lucide-react';
import type { AIRevisionProposal, CopilotMessage, CopilotReply, Trip } from '../types';
import { supabase } from '../lib/supabase';

/** The concierge's authored voice — sent to the server so the AI's actual replies (not just its one-time greeting) answer in this destination's character. See ExperienceCopy in src/destinations/copy.ts. */
export interface DestinationVoiceBrief {
  name: string;
  essence: string;
  mood: string[];
  voiceTags: string[];
  formality: number;
  exuberance: number;
}

interface AIAssistantPanelProps {
  trip: Trip;
  onRevisionProposed: (proposal: AIRevisionProposal) => void;
  /** Set by the proactive suggestion banner to trigger a copilot request from outside the panel. */
  externalPrompt?: string | null;
  onExternalPromptHandled?: () => void;
  /** The destination's authored concierge opener (see ExperienceCopy.aiGreeting) — shown once, before the first real message, only for a themed destination. */
  aiGreeting?: string;
  /** Destination-flavored line shown while the model is thinking (see ExperienceCopy.loadingMessage). Falls back to a generic "Thinking…" when absent. */
  loadingMessage?: string;
  /** Forwarded to revise-itinerary so the concierge's actual replies carry the destination's voice, not just its greeting. */
  destinationVoice?: DestinationVoiceBrief;
}

const SUGGESTION_CHIPS = [
  'Make this trip cheaper',
  'Move beach day to Friday',
  'Add hidden gems',
  'What should I wear?',
  'How much should I tip?',
];

const DEMO_CHIPS = [
  'Make this trip cheaper',
  'Make Day 3 less busy',
  'What scams should I avoid?',
];

/** Shown one at a time while a revise-itinerary request is in flight — makes
 * the wait read as the assistant actively verifying real constraints rather
 * than a generic spinner. */
const CONSTRAINT_CHECKS = [
  'Keep locked activities',
  'Stay below budget',
  'Preserve travel pace',
  'Avoid schedule conflicts',
  'Keep nearby attractions together',
];
const CONSTRAINT_STEP_MS = 550;

type PanelStatus = 'idle' | 'analyzing' | 'error';

function historyKey(tripId: string): string {
  return `planora-copilot-${tripId}`;
}

function loadHistory(tripId: string): CopilotMessage[] {
  try {
    const raw = sessionStorage.getItem(historyKey(tripId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(tripId: string, messages: CopilotMessage[]): void {
  try {
    sessionStorage.setItem(historyKey(tripId), JSON.stringify(messages));
  } catch {
    // sessionStorage unavailable (e.g. private browsing quota) — chat still works, just not persisted
  }
}

function generateId(): string {
  return crypto.randomUUID();
}

export default function AIAssistantPanel({
  trip, onRevisionProposed, externalPrompt, onExternalPromptHandled, aiGreeting, loadingMessage, destinationVoice,
}: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => loadHistory(trip.id));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<PanelStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [constraintStep, setConstraintStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const constraintTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopConstraintTimer = () => {
    if (constraintTimerRef.current) {
      clearInterval(constraintTimerRef.current);
      constraintTimerRef.current = null;
    }
  };

  // Reload history if the user navigates to a different trip's workspace
  useEffect(() => {
    setMessages(loadHistory(trip.id));
  }, [trip.id]);

  useEffect(() => {
    saveHistory(trip.id, messages);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, trip.id]);

  const canSubmit = input.trim().length > 0 && status !== 'analyzing';

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === 'analyzing') return;

    const userMessage: CopilotMessage = { id: generateId(), role: 'user', text: trimmed, createdAt: new Date().toISOString() };
    const conversationHistory = messages
      .filter((m) => m.text || m.proposal)
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: m.text ?? (m.proposal ? `Proposed changes: ${m.proposal.summary}` : ''),
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setStatus('analyzing');
    setErrorMessage(null);
    setConstraintStep(0);
    stopConstraintTimer();
    constraintTimerRef.current = setInterval(() => {
      setConstraintStep((s) => Math.min(s + 1, CONSTRAINT_CHECKS.length));
    }, CONSTRAINT_STEP_MS);

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
          body: JSON.stringify({
            trip_id: trip.id,
            instruction: trimmed,
            conversation_history: conversationHistory,
            destination_voice: destinationVoice ? {
              name: destinationVoice.name,
              essence: destinationVoice.essence,
              mood: destinationVoice.mood,
              voice_tags: destinationVoice.voiceTags,
              formality: destinationVoice.formality,
              exuberance: destinationVoice.exuberance,
            } : undefined,
          }),
          signal: AbortSignal.timeout(60_000),
        },
      );

      const json = await response.json() as
        | { error: string }
        | (CopilotReply & Omit<AIRevisionProposal, 'instruction'>);

      if (!response.ok || 'error' in json) {
        setErrorMessage('error' in json ? json.error : 'Could not respond. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('idle');

      if (json.type === 'answer') {
        setMessages((prev) => [...prev, {
          id: generateId(), role: 'assistant', text: json.message, createdAt: new Date().toISOString(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: generateId(),
          role: 'assistant',
          proposal: { ...json, instruction: trimmed },
          createdAt: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === 'TimeoutError';
      setErrorMessage(
        isTimeout
          ? 'The request timed out. Please try again.'
          : 'Something went wrong. Please check your connection.',
      );
      setStatus('error');
    } finally {
      stopConstraintTimer();
    }
  };

  // Interval is per-component, not per-request — stop it on unmount so a
  // panel switch mid-analysis doesn't leak a timer.
  useEffect(() => stopConstraintTimer, []);

  // Triggered by the proactive suggestion banner — submits on the user's
  // behalf but still only ever produces a reviewable proposal, never an
  // applied change.
  useEffect(() => {
    if (!externalPrompt) return;
    void submitMessage(externalPrompt);
    onExternalPromptHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage(input);
  };

  const handleChipClick = (chip: string) => {
    if (trip.isDemo) {
      void submitMessage(chip);
    } else {
      setInput(chip);
    }
  };

  const chips = trip.isDemo ? DEMO_CHIPS : SUGGESTION_CHIPS;

  return (
    <div className="ai-surface p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 shrink-0">
        <div className="h-9 w-9 rounded-xl ai-gradient flex items-center justify-center shrink-0 shadow-soft">
          <Bot className="text-white" size={18} />
        </div>
        <div>
          <h3 className="font-display text-base font-700 text-ink-900">AI Copilot</h3>
          <p className="text-xs text-ink-600">
            {aiGreeting ? 'Your concierge for this trip' : 'Ask questions or request itinerary changes'}
          </p>
        </div>
      </div>

      {/* Conversation. aria-live announces new messages to screen reader
          users without them having to navigate back into the panel — a
          chat log is exactly the kind of region that updates outside the
          user's own action (the assistant's reply arrives asynchronously). */}
      {messages.length > 0 && (
        <div ref={scrollRef} aria-live="polite" role="log" className="flex-1 overflow-y-auto space-y-3 mb-3 pr-0.5 min-h-0">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-glass/10 text-ink-700' : 'ai-gradient text-white'
              }`}>
                {m.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
              </div>

              {m.text && (
                <div className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] ${
                  m.role === 'user'
                    ? 'bg-brand-500/15 text-ink-800'
                    : 'bg-violet-500/10 text-violet-100'
                }`}>
                  {m.text}
                </div>
              )}

              {m.proposal && (
                <div className="rounded-xl px-3.5 py-3 text-xs bg-violet-500/10 max-w-[85%] space-y-2">
                  <p className="text-violet-100 leading-relaxed">{m.proposal.summary}</p>
                  <div className="flex items-center justify-between text-[10px] text-violet-200/80">
                    <span>{m.proposal.changes.length} change{m.proposal.changes.length === 1 ? '' : 's'} proposed</span>
                    <span className={m.proposal.budget_difference > 0 ? 'text-rose-800 dark:text-rose-300' : m.proposal.budget_difference < 0 ? 'text-emerald-800 dark:text-emerald-300' : ''}>
                      {m.proposal.budget_difference === 0
                        ? 'No budget change'
                        : `${m.proposal.budget_difference > 0 ? '+' : ''}${trip.currency} ${Math.round(m.proposal.budget_difference).toLocaleString()}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRevisionProposed(m.proposal!)}
                    className="btn-primary w-full text-xs py-1.5"
                  >
                    Review changes
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analyzing state — a checklist of real constraints the apply step
          actually enforces (see apply-itinerary-revision), revealed one at a
          time so the wait reads as active verification, not a blind spinner. */}
      {status === 'analyzing' && (
        <div className="rounded-xl bg-violet-500/10 px-3.5 py-3 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="typing-dots"><span /><span /><span /></span>
            <p className="text-xs text-violet-200 leading-relaxed font-medium">
              {loadingMessage || 'Understanding your request…'}
            </p>
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {CONSTRAINT_CHECKS.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-1.5 text-[11px] transition-opacity duration-300 ${i < constraintStep ? 'opacity-100' : 'opacity-35'}`}
              >
                {i < constraintStep
                  ? <Check size={11} className="text-violet-600 dark:text-violet-300 shrink-0" />
                  : <span className="h-[11px] w-[11px] rounded-full border border-current shrink-0" />}
                <span className="text-violet-700 dark:text-violet-200">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && errorMessage && (
        <div className="rounded-xl bg-rose-500/10 px-3.5 py-3 flex items-start gap-2 mb-4 shrink-0">
          <AlertTriangle size={14} className="text-rose-800 dark:text-rose-400 mt-0.5 shrink-0" />
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed whitespace-pre-line">{errorMessage}</p>
        </div>
      )}

      {/* Concierge greeting — the destination's authored opening line, shown
          once before any real conversation exists. Not stored in `messages`;
          purely a welcome moment, styled identically to a real assistant
          bubble so it reads as "the concierge already said hello," not as a
          separate UI element. */}
      {status !== 'analyzing' && messages.length === 0 && aiGreeting && (
        <div className="flex gap-2 mb-3 shrink-0">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ai-gradient text-white">
            <Sparkles size={12} />
          </div>
          <div className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] bg-violet-500/10 text-violet-100">
            {aiGreeting}
          </div>
        </div>
      )}

      {/* Quick request chips */}
      {status !== 'analyzing' && messages.length === 0 && (
        <div className="mb-3 shrink-0">
          <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide mb-2">
            {trip.isDemo
              ? <span className="flex items-center gap-1"><Zap size={11} className="text-amber-800 dark:text-amber-400" /> Quick requests</span>
              : 'Try asking'
            }
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className={`chip transition-colors ${
                  trip.isDemo
                    ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'bg-ink-200/40 text-ink-600 hover:bg-violet-500/10 hover:text-violet-200'
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
          {trip.isDemo && (
            <p className="text-[10px] text-ink-600 mt-1.5">Tap a chip to instantly request a real AI response.</p>
          )}
        </div>
      )}

      {/* Input form */}
      <form className="mt-auto shrink-0" onSubmit={handleSubmit}>
        <label htmlFor="ai-input" className="sr-only">Ask the AI Copilot</label>
        <textarea
          id="ai-input"
          className="input min-h-[64px] resize-none"
          placeholder="Ask a travel question or request a change…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status === 'analyzing'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submitMessage(input);
          }}
        />
        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={!canSubmit}
        >
          {status === 'analyzing'
            ? <><Loader2 size={14} className="animate-spin" /> Thinking…</>
            : <><Send size={14} /> Send</>
          }
        </button>
      </form>

      {/* Demo note */}
      {trip.isDemo && status === 'idle' && (
        <p className="mt-3 text-[10px] text-ink-600 text-center leading-relaxed shrink-0">
          This is a demo trip. Changes are saved to your isolated session.
        </p>
      )}
    </div>
  );
}
