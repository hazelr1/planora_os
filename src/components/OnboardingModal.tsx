import React from 'react';
import { X } from 'lucide-react';

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[min(720px,94%)] rounded-lg bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-700">Welcome to Planora</h3>
            <p className="mt-1 text-sm text-ink-600">A quick tour: lock activities, replan only unlocked parts, and see cost changes before applying.</p>
          </div>
          <button onClick={onClose} aria-label="Close onboarding" className="rounded p-1.5 text-ink-500 hover:bg-glass/5">
            <X size={16} />
          </button>
        </div>

        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-400 text-white flex items-center justify-center">1</div>
            <div>
              <div className="font-medium">Lock what matters</div>
              <div className="text-ink-600">Mark any activity as locked to keep it unchanged during replans.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-400 text-white flex items-center justify-center">2</div>
            <div>
              <div className="font-medium">Replan the rest</div>
              <div className="text-ink-600">Ask the AI concierge to swap, rebalance, or re-schedule without starting over.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-brand-400 text-white flex items-center justify-center">3</div>
            <div>
              <div className="font-medium">Confirm with cost transparency</div>
              <div className="text-ink-600">Every replan shows a before/after cost delta so you know exactly what changed.</div>
            </div>
          </li>
        </ol>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-primary px-5 py-2.5">Got it — Try Demo</button>
        </div>
      </div>
    </div>
  );
}
