import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, PanelRightClose } from 'lucide-react';
import type { AIRevisionProposal, Trip } from '../../types';
import AIAssistantPanel, { type DestinationVoiceBrief } from '../AIAssistantPanel';

interface CopilotDockProps {
  trip: Trip;
  onRevisionProposed: (proposal: AIRevisionProposal) => void;
  externalPrompt: string | null;
  onExternalPromptHandled: () => void;
  /** Renders as a full-height mobile sheet instead of a resizable desktop column. */
  variant?: 'panel' | 'sheet';
  /** Forwarded to AIAssistantPanel — see its own doc comment. */
  aiGreeting?: string;
  /** Forwarded to AIAssistantPanel — see its own doc comment. */
  loadingMessage?: string;
  /** Forwarded to AIAssistantPanel — see its own doc comment. */
  destinationVoice?: DestinationVoiceBrief;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 380;
const COLLAPSED_WIDTH = 56;
const WIDTH_STORAGE_KEY = 'planora-copilot-width';

/**
 * Resizable, collapsible dock for the AI Copilot. The AIAssistantPanel
 * instance below is ALWAYS mounted — collapsing only hides it visually
 * (absolute + invisible), so the conversation is never lost, regardless of
 * how many times the user collapses/expands or resizes the panel.
 */
export default function CopilotDock({
  trip, onRevisionProposed, externalPrompt, onExternalPromptHandled, variant = 'panel', aiGreeting,
  loadingMessage, destinationVoice,
}: CopilotDockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : DEFAULT_WIDTH;
  });
  const draggingRef = useRef(false);

  const stopResize = useCallback(() => { draggingRef.current = false; }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      setWidth((w) => {
        const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w - e.movementX));
        localStorage.setItem(WIDTH_STORAGE_KEY, String(next));
        return next;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stopResize);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stopResize);
    };
  }, [stopResize]);

  const copilot = (
    <AIAssistantPanel
      trip={trip}
      onRevisionProposed={onRevisionProposed}
      externalPrompt={externalPrompt}
      onExternalPromptHandled={onExternalPromptHandled}
      aiGreeting={aiGreeting}
      loadingMessage={loadingMessage}
      destinationVoice={destinationVoice}
    />
  );

  if (variant === 'sheet') {
    // Mobile: always mounted, just translated off-screen when "closed" —
    // opening/closing never remounts it, so the conversation persists.
    return copilot;
  }

  return (
    <motion.div
      animate={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      transition={collapsed || !draggingRef.current ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
      className="relative h-full shrink-0 border-l border-glass/10"
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          onPointerDown={(e) => {
            draggingRef.current = true;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
          }}
          className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-brand-400/40 active:bg-brand-400/50 transition-colors z-10"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI Copilot panel"
        />
      )}

      {/* Collapsed rail */}
      <div className={`h-full flex flex-col items-center pt-4 ${collapsed ? '' : 'hidden'}`}>
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-xl p-2.5 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition"
          aria-label="Expand AI Copilot"
          title="Expand AI Copilot"
        >
          <Bot size={18} />
        </button>
      </div>

      {/* Copilot content — always mounted; hidden visually (not unmounted) when collapsed */}
      <div className={collapsed ? 'invisible pointer-events-none absolute inset-0' : 'h-full p-3 flex flex-col'}>
        <button
          onClick={() => setCollapsed(true)}
          className="self-end shrink-0 mb-1 rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
          aria-label="Collapse AI Copilot"
          title="Collapse AI Copilot"
        >
          <PanelRightClose size={16} />
        </button>
        <div className="flex-1 min-h-0">
          {copilot}
        </div>
      </div>
    </motion.div>
  );
}
