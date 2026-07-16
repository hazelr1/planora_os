import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, MapPin, Calendar, Wallet, Bot, ArrowRight, Check, Loader2 } from 'lucide-react';
import type { Screen } from '../types';
import StatTrio from '../components/StatTrio';
import { pickDaily } from '../lib/dailyRotation';

interface LandingProps {
  onNavigate: (screen: Screen) => void;
  onTryDemo: () => Promise<void>;
}

// landing-hero.jpg (sail against pale sky) was dropped from this pool — it's
// an almost entirely white/gray/pale-blue photo, so no CSS filter can make
// it read as colorful; there's essentially no color in the source pixels to
// amplify. The remaining two are both genuinely vivid (teal glacial lake,
// golden-hour Rio de Janeiro).
const HERO_IMAGES = ['/image/landing-hero-2.jpg', '/image/landing-hero-3.jpg'];
const SHOWCASE = [
  { name: 'Santorini', region: 'Greece', essence: 'Whitewashed cliffs above a caldera sea.', images: ['/image/destination-santorini.jpg', '/image/destination-santorini-2.jpg'] },
  { name: 'Kyoto', region: 'Japan', essence: 'Temple bells and quiet backstreets.', images: ['/image/destination-kyoto.jpg', '/image/destination-kyoto-2.jpg'] },
  { name: 'Marrakech', region: 'Morocco', essence: 'Zellige tile and saffron-lit souks.', images: ['/image/destination-marrakech.jpg', '/image/destination-marrakech-2.jpg'] },
  { name: 'Reykjavik', region: 'Iceland', essence: 'Glacial light over volcanic coastline.', images: ['/image/destination-iceland.jpg', '/image/destination-iceland-2.jpg'] },
];

const SHOWCASE_TILT = ['-rotate-2', 'rotate-3', '-rotate-3', 'rotate-2'];

const HERO_STATS: [{ value: string; label: string }, { value: string; label: string }, { value: string; label: string }] = [
  { value: '50K+', label: 'trips planned' },
  { value: '180+', label: 'destinations' },
  { value: '12 min', label: 'avg. planning time' },
];

const revealUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

export default function Landing({ onNavigate, onTryDemo }: LandingProps) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const heroImage = pickDaily(HERO_IMAGES, 'hero');

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

  const revealProps = prefersReducedMotion
    ? {}
    : { initial: 'hidden', whileInView: 'show', viewport: { once: true, margin: '-80px' } };

  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className="relative -mx-4 -mt-6 overflow-hidden sm:-mx-6 sm:-mt-8">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover"
            style={{ filter: 'saturate(2.2) contrast(1.15) brightness(0.82)' }}
          />
          {/* Duotone color wash — a real blend (not a flat alpha overlay), so
              it actually shifts the photo's own highlights/midtones/shadows
              toward amber/teal instead of just darkening them. Far more
              reliable "make it colorful" than pushing saturate() alone,
              which can only amplify color that's already in the source. */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(217,119,6,0.55) 0%, transparent 45%, transparent 55%, rgba(8,145,178,0.55) 100%)',
              mixBlendMode: 'color',
            }}
          />
          {/* Warm amber/sky atmospheric tint (subtle, adds depth on top of the duotone) */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-900/25 via-transparent to-sky-900/20" />
          {/* Strong bottom scrim behind headline/CTA */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/25 to-transparent" />
          {/* Subtle top darkening for nav */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/35 via-transparent to-transparent" />
        </div>

        <div className="relative flex min-h-[78vh] flex-col items-center justify-end px-4 pb-28 pt-24 text-center sm:min-h-[85vh] sm:pb-36">
          <div className="inline-flex items-center gap-2 chip bg-white/10 text-white mb-8 animate-fade-in backdrop-blur-sm">
            <Sparkles size={13} className="text-amber-300" />
            <span className="font-semibold">AI-powered travel planner</span>
          </div>
          <h1 className="font-display max-w-4xl text-5xl leading-[0.98] tracking-tight text-white animate-slide-up sm:text-7xl lg:text-8xl">
            <span className="block font-500 text-white/80">Your trip plan</span>
            <span className="font-wordmark block text-7xl uppercase leading-[0.82] tracking-wide text-white sm:text-9xl lg:text-[9.5rem]">
              Changes
            </span>
            <span className="block font-700 text-3xl sm:text-5xl">when you do.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-lg text-white/80 leading-relaxed animate-slide-up sm:text-xl" style={{ animationDelay: '80ms' }}>
            Generate a personalized itinerary, edit every detail, and let AI adapt it around your budget, time, and travel style.
          </p>
        </div>

        <motion.div
          className="card relative z-10 mx-4 -mt-16 max-w-2xl p-6 shadow-pop animate-scale-in sm:mx-auto sm:p-8"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => onNavigate({ name: 'create' })}
                className="btn-primary text-base px-6 py-3 w-full sm:w-auto"
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
            <div className="flex flex-col items-center gap-2 text-xs text-ink-500 sm:items-end">
              {['Free Demo', 'Free to explore', 'Edit every detail'].map((text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Check size={12} className="text-brand-500 dark:text-brand-400 shrink-0" /> {text}
                </span>
              ))}
            </div>
          </div>
          {demoError && (
            <p className="mt-4 text-center text-sm text-rose-700 dark:text-rose-400">{demoError}</p>
          )}
          <div className="mt-6 flex justify-center border-t border-glass/10 pt-5 sm:justify-start">
            <StatTrio stats={HERO_STATS} />
          </div>
        </motion.div>
      </section>

      {/* ─── Why Planora, not just a chatbot ─── */}
      <section className="pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="section-eyebrow mb-6">Why not just ask a chatbot?</div>
            <motion.h2
              {...revealProps}
              variants={revealUp}
              className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
            >
              Every recommendation comes with its reasoning.
            </motion.h2>
            <motion.p
              {...revealProps}
              variants={revealUp}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-md text-ink-600 leading-relaxed"
            >
              A chatbot gives you a list. Planora tells you why each place made the cut — how it fits your budget, your pace, and what's nearby — so you can trust the plan instead of re-Googling every stop.
            </motion.p>
          </div>

          <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }} className="card p-5 sm:p-6">
            <span className="chip bg-brand-500/10 text-brand-700 dark:text-brand-300 font-600">14:00 · Culture</span>
            <p className="font-display text-base font-700 text-ink-900 mt-3">Tokyo National Museum</p>
            <p className="text-xs text-ink-600 mt-1">13-9 Uenokoen, Taito City</p>
            <div className="mt-3.5 rounded-lg bg-violet-500/10 px-3.5 py-2.5 flex items-start gap-2">
              <Sparkles size={13} className="text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-700 dark:text-violet-200 leading-relaxed">
                The world's largest collection of Japanese art at a modest entry fee — placed after lunch so you're not rushing through 10,000 years of history on an empty stomach.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Destination showcase ─── */}
      <section className="pt-20 pb-24 sm:pt-24">
        <div className="section-eyebrow mb-8">A world of destinations</div>
        <motion.h2
          {...revealProps}
          variants={revealUp}
          className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
        >
          Every destination gets its own atmosphere.
        </motion.h2>
        <motion.p
          {...revealProps}
          variants={revealUp}
          transition={{ delay: 0.05 }}
          className="mt-4 max-w-md text-ink-600 leading-relaxed"
        >
          Open a trip and Planora composes its palette, motion, and voice from the place itself — never a generic template.
        </motion.p>

        <motion.div
          {...revealProps}
          transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
          className="mt-14 flex flex-nowrap gap-0 overflow-x-auto px-1 pb-6 pt-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-2"
        >
          {SHOWCASE.map((d, i) => (
            <motion.div
              key={d.name}
              variants={revealUp}
              style={{ zIndex: i + 1 }}
              className={`card group relative aspect-[4/5] w-48 shrink-0 overflow-hidden p-0 shadow-pop transition-all duration-300 ease-out hover:z-20 hover:-translate-y-3 hover:rotate-0 hover:shadow-glow-lg sm:w-56 ${i > 0 ? '-ml-12 sm:-ml-16' : ''} ${SHOWCASE_TILT[i % SHOWCASE_TILT.length]}`}
            >
              <img
                src={pickDaily(d.images, d.name)}
                alt={`${d.name}, ${d.region}`}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">{d.region}</p>
                <p className="font-display mt-1 text-xl font-600 text-white">{d.name}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/75 line-clamp-2">{d.essence}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Feature section ─── */}
      <section className="pb-28">
        <div className="section-eyebrow mb-8">Everything your trip needs</div>
        <motion.h2
          {...revealProps}
          variants={revealUp}
          className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
        >
          All in one place, built to flex with your plans.
        </motion.h2>

        <motion.div
          {...revealProps}
          transition={{ staggerChildren: 0.08, delayChildren: 0.1 }}
          className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          <Feature icon={<MapPin size={20} />} title="Smart destinations" desc="Organize trips by city, region, or multi-stop route." offset />
          <Feature icon={<Calendar size={20} />} title="Day-by-day plans" desc="Activities with times, durations, locations, and costs." />
          <Feature icon={<Wallet size={20} />} title="Budget tracking" desc="Live estimated totals and remaining budget per trip." offset />
          <Feature icon={<Bot size={20} />} title="AI replanning" desc="Ask the assistant to reshape your trip in seconds." />
        </motion.div>

        <motion.div
          {...revealProps}
          variants={revealUp}
          transition={{ delay: 0.15 }}
          className="relative mt-16 overflow-hidden rounded-[28px] bg-gradient-to-br from-brand-500/15 via-blue-500/10 to-violet-500/15 p-10 text-center shadow-glow sm:p-14"
        >
          <p className="font-display mx-auto max-w-xl text-2xl font-700 leading-snug text-ink-900 sm:text-3xl">
            &ldquo;The AI travel planner that adapts with you.&rdquo;
          </p>
          <p className="mt-4 text-sm text-brand-700 dark:text-brand-300">
            Build your perfect itinerary, then ask AI to make it better.
          </p>
          <button
            onClick={() => onNavigate({ name: 'create' })}
            className="btn-primary mt-8 text-sm px-6 py-2.5 mx-auto"
          >
            Plan your next trip <ArrowRight size={15} />
          </button>
        </motion.div>
      </section>
    </div>
  );
}

function Feature({ icon, title, desc, offset }: { icon: React.ReactNode; title: string; desc: string; offset?: boolean }) {
  return (
    <motion.div
      variants={revealUp}
      className={`card card-interactive p-6 ${offset ? 'sm:mt-6' : ''}`}
    >
      <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-sm font-700 text-ink-900">{title}</h3>
      <p className="text-xs text-ink-600 mt-2 leading-relaxed">{desc}</p>
    </motion.div>
  );
}