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
          {/* Scrim confined to the bottom third — keeps the upper sky/mountain
              two-thirds of the photo clean (so the headline reads against
              the image itself, not a dark wash) while fully grounding the
              CTA card and burying the busier city/harbor detail low in the
              frame. */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(2,6,15,0.96) 0%, rgba(2,6,15,0.8) 18%, rgba(2,6,15,0.2) 34%, transparent 50%)' }}
          />
          {/* Subtle top darkening for nav legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-transparent" />
          {/* Soft vignette centered on the headline/subhead block only — the
              bottom-third scrim above doesn't reach this high, and the sky/
              mountain photo underneath varies in brightness, so text here
              relies on this plus per-line text-shadow for contrast instead
              of a hard overlay that would flatten the "clean photo" look. */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 65% 42% at 50% 46%, rgba(2,6,15,0.38), transparent 72%)' }}
          />
        </div>

        <div className="relative flex min-h-[82vh] flex-col items-center px-4 pb-40 pt-12 text-center sm:min-h-[92vh] sm:pb-48 sm:pt-16">
          {/* Tiny overline, deliberately small and set apart from the
              headline below (not mb-tight-coupled to it) so it reads as a
              label, not a competing line of the hero copy. */}
          <div className="inline-flex items-center gap-1.5 chip bg-white/10 px-2.5 py-1 text-white/90 animate-fade-in backdrop-blur-sm">
            <Sparkles size={11} className="text-amber-300" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">AI-powered travel planner</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center">
            <h1
              className="font-display max-w-5xl text-3xl leading-[0.98] tracking-tight text-white animate-slide-up sm:text-5xl lg:text-6xl"
              style={{ textShadow: '0 2px 3px rgba(0,0,0,0.55), 0 16px 50px rgba(0,0,0,0.4)' }}
            >
              <span className="block font-500 text-white/80">Your trip plan</span>
              <span className="font-hero text-hero block w-full uppercase text-white">
                Changes
              </span>
              <span className="block font-700 text-xl sm:text-3xl lg:text-4xl">when you do.</span>
            </h1>
            <p
              className="mx-auto mt-6 max-w-xl text-base text-white/90 leading-relaxed animate-slide-up sm:text-lg"
              style={{ animationDelay: '80ms', textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 10px 34px rgba(0,0,0,0.5)' }}
            >
              Generate a personalized itinerary, edit every detail, and let AI adapt it around your budget, time, and travel style.
            </p>
          </div>
        </div>

        <motion.div
          className="card relative z-10 mx-4 -mt-14 max-w-2xl p-5 shadow-pop animate-scale-in sm:mx-auto sm:-mt-16 sm:p-6"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => onNavigate({ name: 'create' })}
                className="btn-primary text-base px-6 py-2.5 w-full sm:w-auto"
              >
                Start Planning <ArrowRight size={16} />
              </button>
              <button
                onClick={handleTryDemo}
                disabled={demoLoading}
                className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 text-base px-6 py-2.5 w-full sm:w-auto min-w-[140px]"
              >
                {demoLoading
                  ? <><Loader2 size={15} className="animate-spin" /> Preparing…</>
                  : 'Try Demo'
                }
              </button>
            </div>
            {/* Fixed light colors (not theme-driven ink/brand tones) — this
                card always sits on the hero photo's dark bottom scrim,
                regardless of app theme, so its text needs to stay legible
                against that scrim rather than against a page background. */}
            <div className="flex flex-col items-center gap-2 text-xs text-white/70 sm:items-end">
              {['Free to explore', 'Edit every detail'].map((text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Check size={12} className="text-brand-300 shrink-0" /> {text}
                </span>
              ))}
            </div>
          </div>
          {demoError && (
            <p className="mt-4 text-center text-sm text-rose-300">{demoError}</p>
          )}
          <div className="mt-4 flex justify-center border-t border-white/15 pt-4 sm:justify-start">
            <StatTrio stats={HERO_STATS} onDark />
          </div>
        </motion.div>
      </section>

      {/* ─── Why Planora: reasoning, not just results ─── */}
      <section className="pt-24 pb-20 sm:pt-32 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="section-eyebrow mb-6">Reasoning, not just results</div>
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
              A list of places doesn't tell you why they belong together. Planora shows its work — how each stop fits your budget, your pace, and what's nearby — so you can trust the plan instead of re-Googling every stop.
            </motion.p>
          </div>

          <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }} className="relative">
            {/* Connecting spine — reads as "one stop in a day plan" even
                though only this single entry is shown. */}
            <div className="absolute bottom-2 left-1.5 top-2 w-px bg-glass/15" aria-hidden="true" />

            <div className="flex gap-4">
              <div className="flex w-3 shrink-0 justify-center pt-2">
                <span className="h-3 w-3 rounded-full bg-brand-500 ring-4 ring-brand-500/15 dark:bg-brand-400 dark:ring-brand-400/15" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-600 text-ink-500">14:00</span>
                <div className="card mt-1.5 p-5 sm:p-6">
                  <span className="chip bg-brand-500/10 text-brand-700 dark:text-brand-300 font-600">Culture</span>
                  <p className="font-display text-base font-700 text-ink-900 mt-3">Tokyo National Museum</p>
                  <p className="text-xs text-ink-600 mt-1">13-9 Uenokoen, Taito City</p>
                  <div className="mt-3.5 rounded-lg bg-violet-500/10 px-3.5 py-2.5 flex items-start gap-2">
                    <Sparkles size={13} className="text-violet-600 dark:text-violet-300 mt-0.5 shrink-0" />
                    <p className="text-xs text-violet-700 dark:text-violet-200 leading-relaxed">
                      The world's largest collection of Japanese art at a modest entry fee — placed after lunch so you're not rushing through 10,000 years of history on an empty stomach.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Destination showcase ─── */}
      <section className="pt-20 pb-24 sm:pt-24">
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
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-5"
        >
          {SHOWCASE.map((d) => (
            <motion.div
              key={d.name}
              variants={revealUp}
              className="card group relative aspect-[4/5] overflow-hidden p-0 shadow-pop transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-glow-lg"
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
      <section className="pt-20 pb-28 sm:pt-24">
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
          className="relative mt-16 overflow-hidden rounded-card-lg p-10 text-center shadow-glow sm:p-14"
        >
          <div className="absolute inset-0">
            <img src="/image/destination-generic-highlands.jpg" alt="" className="h-full w-full object-cover" />
            {/* Fixed dark scrim (not theme-driven) — deliberately strong so
                this closing section reads as a clear visual break from the
                page background in both light and dark mode, not just a
                tinted photo. */}
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
          </div>

          <div className="relative">
            <p
              className="font-display mx-auto max-w-xl text-2xl font-700 leading-snug text-white sm:text-3xl"
              style={{ textShadow: '0 2px 3px rgba(0,0,0,0.5), 0 12px 40px rgba(0,0,0,0.4)' }}
            >
              &ldquo;The AI travel planner that adapts with you.&rdquo;
            </p>
            <p className="mt-4 text-sm text-white/75">
              Build your perfect itinerary, then ask AI to make it better.
            </p>
            <button
              onClick={() => onNavigate({ name: 'create' })}
              className="btn-primary mt-8 text-sm px-6 py-2.5 mx-auto"
            >
              Plan your next trip <ArrowRight size={15} />
            </button>
          </div>
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