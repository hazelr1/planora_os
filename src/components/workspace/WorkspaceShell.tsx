import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import type { AIRevisionProposal, Trip } from '../../types';
import type { WorkspaceSectionId } from './types';
import WorkspaceSidebar from './WorkspaceSidebar';
import MobileWorkspaceNav from './MobileWorkspaceNav';
import CopilotDock from './CopilotDock';
import type { DestinationVoiceBrief } from '../AIAssistantPanel';

interface WorkspaceShellProps {
  trip: Trip;
  activeSection: WorkspaceSectionId;
  onSelectSection: (section: WorkspaceSectionId) => void;
  header: ReactNode;
  children: ReactNode;
  onRevisionProposed: (proposal: AIRevisionProposal) => void;
  externalPrompt: string | null;
  onExternalPromptHandled: () => void;
  /** Forwarded to CopilotDock/AIAssistantPanel — see AIAssistantPanel's own doc comment. */
  aiGreeting?: string;
  /** Forwarded to CopilotDock/AIAssistantPanel — see AIAssistantPanel's own doc comment. */
  loadingMessage?: string;
  /** Forwarded to CopilotDock/AIAssistantPanel — see AIAssistantPanel's own doc comment. */
  destinationVoice?: DestinationVoiceBrief;
}

export default function WorkspaceShell({
  trip, activeSection, onSelectSection, header, children,
  onRevisionProposed, externalPrompt, onExternalPromptHandled, aiGreeting, loadingMessage, destinationVoice,
}: WorkspaceShellProps) {
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false);

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar — icon rail on tablet, full labels on desktop, hidden on mobile */}
      <div className="hidden md:block md:w-14 lg:w-56 shrink-0 border-r border-glass/10">
        <WorkspaceSidebar
          active={activeSection}
          onSelect={onSelectSection}
          tripTitle={trip.title}
          destination={trip.destination}
        />
      </div>

      {/* Center panel — its own independent scroll region */}
      <div className="flex-1 min-w-0 h-full overflow-y-auto pb-20 md:pb-0">
        {/* `relative` lives on the content wrapper itself (not the scroll
            viewport above) so the backdrop's `inset:0` sizes to the full
            scrollable content height and scrolls with it, instead of being
            pinned to just the first screenful. Faint destination atmosphere
            behind the content — see .dest-ambient-backdrop and
            .dest-texture-backdrop in index.css. Both resolve to `none`
            outside a themed trip, so this is a no-op everywhere else. */}
        <div className="relative px-5 sm:px-8 py-6 sm:py-8">
          <div className="dest-ambient-backdrop z-0" aria-hidden="true" />
          <div className="dest-texture-backdrop z-0" aria-hidden="true" />
          <div className="relative z-10">
            {header}
            <div className="mt-6">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Copilot — resizable/collapsible column on tablet+, hidden here on mobile */}
      <div className="hidden md:block h-full">
        <CopilotDock
          trip={trip}
          onRevisionProposed={onRevisionProposed}
          externalPrompt={externalPrompt}
          onExternalPromptHandled={onExternalPromptHandled}
          aiGreeting={aiGreeting}
          loadingMessage={loadingMessage}
          destinationVoice={destinationVoice}
        />
      </div>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30">
        <MobileWorkspaceNav active={activeSection} onSelect={onSelectSection} />
      </div>

      {/* Mobile floating "Ask Planora" trigger — softer shadow than shadow-pop
          so it reads as available rather than visually dominant. */}
      <button
        onClick={() => setMobileCopilotOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full ai-gradient shadow-soft flex items-center justify-center text-white"
        aria-label="Open Ask Planora"
      >
        <Sparkles size={20} />
      </button>

      {/* Mobile Copilot sheet — always mounted in the DOM (never conditionally
          rendered), exactly like the desktop collapse: only opacity/transform
          toggle, so the AIAssistantPanel instance inside CopilotDock never
          unmounts and the conversation can never be lost by opening/closing. */}
      <motion.div
        className="md:hidden fixed inset-0 z-40 flex items-end"
        animate={{ opacity: mobileCopilotOpen ? 1 : 0 }}
        style={{ pointerEvents: mobileCopilotOpen ? 'auto' : 'none' }}
        aria-hidden={!mobileCopilotOpen}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileCopilotOpen(false)} />
        <motion.div
          className="relative w-full max-h-[85vh] h-[85vh] rounded-t-2xl overflow-hidden bg-ink-50 border-t border-glass/10 flex flex-col"
          animate={{ y: mobileCopilotOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass/10 shrink-0">
            <span className="text-sm font-700 text-ink-900">Ask Planora</span>
            <button
              onClick={() => setMobileCopilotOpen(false)}
              className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition"
              aria-label="Close Ask Planora"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 min-h-0 p-3">
            <CopilotDock
              variant="sheet"
              trip={trip}
              onRevisionProposed={onRevisionProposed}
              externalPrompt={externalPrompt}
              onExternalPromptHandled={onExternalPromptHandled}
              aiGreeting={aiGreeting}
              loadingMessage={loadingMessage}
              destinationVoice={destinationVoice}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
