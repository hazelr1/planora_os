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
        <div className="max-w-3xl mx-auto text-center px-4 py-24 sm:py-28">
          <div className="inline-flex items-center gap-2 chip bg-brand-500/10 border border-brand-400/20 mb-9 animate-fade-in">
            <Sparkles size={13} className="text-violet-300" />
            <span className="ai-shimmer font-semibold">AI-powered travel planner</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-800 text-ink-900 leading-[1.12] tracking-tight animate-slide-up">
            Your trip plan should<br />
            <span className="text-brand-400">change when you do.</span>
          </h1>
          <p className="mt-7 text-lg sm:text-xl text-ink-600 leading-relaxed max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '80ms' }}>
            Generate a personalized itinerary, edit every detail, and let AI adapt it around your budget, time, and travel style.
          </p>
          <div className="mt-11 flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: '140ms' }}>
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
      <section className="pb-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-700 text-ink-900 tracking-tight">Everything your trip needs</h2>
            <p className="text-ink-600 mt-3">All in one place, built to flex with your plans.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Feature icon={<MapPin size={20} />} title="Smart destinations" desc="Organize trips by city, region, or multi-stop route." />
            <Feature icon={<Calendar size={20} />} title="Day-by-day plans" desc="Activities with times, durations, locations, and costs." />
            <Feature icon={<Wallet size={20} />} title="Budget tracking" desc="Live estimated totals and remaining budget per trip." />
            <Feature icon={<Bot size={20} />} title="AI replanning" desc="Ask the assistant to reshape your trip in seconds." />
          </div>

          <div className="mt-14 rounded-2xl bg-gradient-to-r from-brand-500/15 via-blue-500/10 to-violet-500/15 border border-brand-400/20 p-8 sm:p-10 text-center backdrop-blur-2xl shadow-glow">
            <p className="font-display text-xl sm:text-2xl font-700 leading-snug text-ink-900">
              "The AI travel planner that adapts with you."
            </p>
            <p className="mt-3 text-brand-300/80 text-sm">
              Build your perfect itinerary, then ask AI to make it better.
            </p>
            <button
              onClick={() => onNavigate({ name: 'create' })}
              className="btn-primary mt-7 text-sm px-6 py-2.5 mx-auto"
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
    <div className="card card-interactive p-6">
      <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-300 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-sm font-700 text-ink-900">{title}</h3>
      <p className="text-xs text-ink-600 mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}
