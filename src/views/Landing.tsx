import { useState } from 'react';
import { Sparkles, MapPin, Calendar, Wallet, Bot, ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Screen } from '../types';

interface LandingProps {
  onNavigate: (screen: Screen) => void;
  onTryDemo: () => Promise<void>;
}

export default function Landing({ onNavigate, onTryDemo }: LandingProps) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleTryDemo = async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      await onTryDemo();
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : 'Could not start demo. Please try again.');
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center">
        <div className="max-w-3xl mx-auto text-center px-4 py-20">
          <div className="inline-flex items-center gap-2 chip bg-brand-500/10 text-brand-300 border border-brand-400/20 mb-8">
            <Sparkles size={13} /> AI-powered travel planner
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-800 text-ink-900 leading-[1.1] tracking-tight">
            Your trip plan should<br />
            <span className="text-brand-400">change when you do.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-ink-600 leading-relaxed max-w-2xl mx-auto">
            Generate a personalized itinerary, edit every detail, and let AI adapt it around your budget, time, and travel style.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate({ name: 'create' })}
              className="btn-primary text-base px-6 py-3 w-full sm:w-auto shadow-soft"
            >
              Start Planning <ArrowRight size={16} />
            </button>
            <button
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="btn-outline text-base px-6 py-3 w-full sm:w-auto min-w-[140px]"
            >
              {demoLoading
                ? <><Loader2 size={15} className="animate-spin" /> Preparing…</>
                : 'Try Demo'
              }
            </button>
          </div>
          {demoError && (
            <p className="mt-4 text-sm text-rose-400">{demoError}</p>
          )}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ink-500">
            {['No account required', 'Free to explore', 'Edit every detail'].map((text) => (
              <span key={text} className="flex items-center gap-1.5">
                <Check size={12} className="text-brand-400" /> {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature section */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-700 text-ink-900">Everything your trip needs</h2>
            <p className="text-ink-600 mt-2">All in one place, built to flex with your plans.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Feature icon={<MapPin size={20} />} title="Smart destinations" desc="Organize trips by city, region, or multi-stop route." />
            <Feature icon={<Calendar size={20} />} title="Day-by-day plans" desc="Activities with times, durations, locations, and costs." />
            <Feature icon={<Wallet size={20} />} title="Budget tracking" desc="Live estimated totals and remaining budget per trip." />
            <Feature icon={<Bot size={20} />} title="AI replanning" desc="Ask the assistant to reshape your trip in seconds." />
          </div>

          <div className="mt-12 rounded-2xl bg-gradient-to-r from-brand-500/20 to-blue-500/20 border border-brand-400/20 p-8 text-center backdrop-blur-xl">
            <p className="font-display text-xl sm:text-2xl font-700 leading-snug text-ink-900">
              "The AI travel planner that adapts with you."
            </p>
            <p className="mt-3 text-brand-300/80 text-sm">
              Build your perfect itinerary, then ask AI to make it better.
            </p>
            <button
              onClick={() => onNavigate({ name: 'create' })}
              className="mt-6 inline-flex items-center gap-2 bg-brand-500 text-ink-950 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-brand-400 transition shadow-soft"
            >
              Plan your next trip <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-5">
      <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-300 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-sm font-700 text-ink-900">{title}</h3>
      <p className="text-xs text-ink-600 mt-1.5 leading-relaxed">{desc}</p>
    </div>
  );
}
