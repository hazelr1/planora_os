import { Lock, MapPin, Timer, DollarSign, Sparkles, User, Calendar, Users } from 'lucide-react';

/**
 * Small, purpose-built previews for the landing page's feature sections —
 * real components built from the app's own tokens/classes (not screenshots),
 * so they render identically and reliably in both themes with no capture
 * step. Each shows only the minimum needed to tell its section's story;
 * none of these are wired to real data or interactive.
 */

export function LockedActivityMock() {
  return (
    <div className="h-full w-full bg-ink-100 p-5 flex flex-col justify-center gap-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-600 text-ink-900 tabular-nums">07:30</span>
        <span className="text-xs text-ink-500">Culture</span>
        <span className="inline-flex items-center gap-1 text-xs font-600 text-ai-accent">
          <Lock size={11} /> Locked
        </span>
      </div>
      <h4 className="font-display text-base font-600 text-ink-900">Senso-ji Temple at Dawn</h4>
      <p className="text-sm text-ink-600 leading-relaxed">
        Arrive before the crowds for a quiet walk through Tokyo's oldest temple.
      </p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-ink-500 shrink-0" /> Asakusa, Tokyo
        </span>
        <span className="flex items-center gap-1.5">
          <Timer size={13} className="text-ink-500 shrink-0" /> 1h 30m
        </span>
        <span className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-ink-500 shrink-0" /> Free
        </span>
      </div>
      <div className="pl-3 border-l-2 border-violet-400/30 flex items-start gap-1.5">
        <Sparkles size={12} className="text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-700 dark:text-violet-200 leading-relaxed">
          Visiting at dawn means near-solitude before the tour groups arrive.
        </p>
      </div>
    </div>
  );
}

export function ConciergeExchangeMock() {
  return (
    <div className="h-full w-full bg-ink-100 p-5 flex flex-col justify-center gap-3">
      <div className="flex gap-2 flex-row-reverse">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 bg-glass/10 text-ink-700">
          <User size={12} />
        </div>
        <div className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] bg-brand-500/15 text-ink-800">
          Can you make Day 3 less rushed?
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ai-gradient text-white">
          <Sparkles size={12} />
        </div>
        <div className="rounded-xl px-3.5 py-2.5 text-xs leading-relaxed max-w-[85%] bg-violet-500/10 text-violet-100">
          Moved the afternoon museum to Day 4 and added a coffee break before dinner — your budget stays exactly the same.
        </div>
      </div>
    </div>
  );
}

export function DemoTripMock() {
  return (
    <div className="h-full w-full bg-ink-100 flex flex-col">
      <div className="relative basis-2/5 shrink-0 overflow-hidden">
        <img src="/image/destination-tokyo.jpg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center gap-2">
        <h4 className="font-display text-lg font-700 text-ink-900">Tokyo Discovery</h4>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-ink-500 shrink-0" /> Tokyo, Japan
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} className="text-ink-500 shrink-0" /> Aug 11 – 15
          </span>
          <span className="flex items-center gap-1.5">
            <Users size={13} className="text-ink-500 shrink-0" /> 1 traveler
          </span>
        </div>
      </div>
    </div>
  );
}
