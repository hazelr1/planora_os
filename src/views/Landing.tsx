import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ChevronDown, ArrowRight, Check, Loader2, Clock, X } from 'lucide-react';
import type { Screen } from '../types';
import { templateRepository } from '../data';
import StatTrio from '../components/StatTrio';
import DestinationPlanCard from '../components/DestinationPlanCard';
import { pickDaily } from '../lib/dailyRotation';

interface LandingProps {
  onNavigate: (screen: Screen) => void;
  onTryDemo: () => Promise<void>;
  /** Demo sessions can't generate custom AI trips — the hero/closing CTAs point at suggested plans instead. */
  isDemo?: boolean;
  /** Set when a demo session was ended out from under the user (the hourly cleanup job deleted the account) rather than by a deliberate sign-out. */
  sessionExpiredNotice?: boolean;
  onDismissSessionExpiredNotice?: () => void;
}

// landing-hero.jpg (sail against pale sky) was dropped from this pool — it's
// an almost entirely white/gray/pale-blue photo, so no CSS filter can make
// it read as colorful; there's essentially no color in the source pixels to
// amplify. The remaining two are both genuinely vivid (teal glacial lake,
// golden-hour Rio de Janeiro).
const HERO_IMAGES = ['/image/landing-hero-2.jpg', '/image/landing-hero-3.jpg'];

// The full pool this section's teaser samples from — every entry has a real
// approved trip_templates row backing it (see
// findApprovedTemplatesByDestinationNames below), so whichever subset gets
// shown is always genuinely clickable into a suggested plan, never an
// arbitrary destination list. Only a random few are shown at once (see
// sampleShowcase) — a fresh sample every page load, not this whole set.
// `name` doubles as the prefix used to match against a template's
// `destination` column, so it needs to be the leading segment of that
// column (e.g. "Ubud", not "Bali", since the template's destination is
// "Ubud, Bali, Indonesia"). Marrakech never had an approved template in the
// pool — Jaipur takes its "market and craft" register instead. Five of ten
// reuse this app's bundled destination photos; the rest resolve a live
// photo per destination (see DestinationPlanCard).
const SHOWCASE = [
  { name: 'Santorini', region: 'Greece', essence: 'Whitewashed cliffs above a caldera sea.', images: ['/image/destination-santorini.jpg', '/image/destination-santorini-2.jpg'] },
  { name: 'Kyoto', region: 'Japan', essence: 'Temple bells and quiet backstreets.', images: ['/image/destination-kyoto.jpg', '/image/destination-kyoto-2.jpg'] },
  { name: 'Reykjavik', region: 'Iceland', essence: 'Glacial light over volcanic coastline.', images: ['/image/destination-iceland.jpg', '/image/destination-iceland-2.jpg'] },
  { name: 'Ubud', region: 'Bali, Indonesia', essence: 'Terraced rice fields and temple incense in the hills.', images: ['/image/destination-bali.jpg'] },
  { name: 'Lisbon', region: 'Portugal', essence: 'Tiled facades and fado drifting up from the river.', images: ['/image/destination-lisbon.jpg'] },
  { name: 'Jaipur', region: 'India', essence: 'Pink sandstone forts above a spice-market maze.' },
  { name: 'Dubai', region: 'United Arab Emirates', essence: 'Glass towers rising clean out of the dune line.' },
  { name: 'Rome', region: 'Italy', essence: 'Marble ruins keeping time beside espresso bars.' },
  { name: 'Barcelona', region: 'Spain', essence: 'Gaudí’s curves against a Mediterranean grid.' },
  { name: 'Seoul', region: 'South Korea', essence: 'Neon alleys and palace eaves under one skyline.' },
];

const HERO_STATS: [{ value: string; label: string }, { value: string; label: string }, { value: string; label: string }] = [
  { value: 'Browse', label: 'trips others have planned' },
  { value: '180+', label: 'destinations' },
  { value: '12 min', label: 'avg. planning time' },
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What is Planora?',
    answer: 'Planora is an AI travel planner that builds a personalized itinerary and adapts it as your trip changes — without losing the plans you’ve already locked in.',
  },
  {
    question: 'How does replanning work?',
    answer: 'When you replan, Planora only touches what’s unlocked, and shows you a before/after cost comparison for the change so you always know the impact.',
  },
  {
    question: 'What are Suggested Trip Plans?',
    answer: 'AI-generated, pre-built itineraries for popular destinations that you can browse and use as a starting point instead of building from scratch.',
  },
  {
    question: 'What happens when I edit a suggested plan?',
    answer: 'Editing it clones the plan into your own trips — the original stays unchanged for the next person who browses it.',
  },
  {
    question: 'What does Demo Mode let me do?',
    answer: 'Explore Planora risk-free with a seeded trip, no account settings or unlimited trip creation, for a limited time.',
  },
  {
    question: 'How is this different from other AI trip planners?',
    answer: 'Most regenerate your whole itinerary on every change. Planora protects what you’ve locked and shows you exactly what changed and what it cost.',
  },
];

const revealUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const SHOWCASE_SAMPLE_SIZE = 5;

/** A fresh random slice of SHOWCASE — a small teaser, not the whole pool. Recomputed on every mount, so a reload shows a different set. */
function sampleShowcase() {
  const shuffled = [...SHOWCASE];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, SHOWCASE_SAMPLE_SIZE);
}

export default function Landing({ onNavigate, onTryDemo, isDemo = false, sessionExpiredNotice = false, onDismissSessionExpiredNotice }: LandingProps) {
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [showcaseTemplateIds, setShowcaseTemplateIds] = useState<Record<string, string>>({});
  const [showcase] = useState(sampleShowcase);
  const prefersReducedMotion = useReducedMotion();
  const heroImage = pickDaily(HERO_IMAGES, 'hero');

  // Links a showcase card straight to its matching approved template, when
  // one exists — the "See more" grid below is the primary path regardless.
  useEffect(() => {
    let cancelled = false;
    templateRepository.findApprovedTemplatesByDestinationNames(showcase.map((d) => d.name)).then((result) => {
      if (cancelled || !result.ok) return;
      const matches: Record<string, string> = {};
      for (const t of result.data) {
        const showcaseMatch = showcase.find((d) => t.destination.toLowerCase().startsWith(d.name.toLowerCase()));
        if (showcaseMatch) matches[showcaseMatch.name] = t.id;
      }
      setShowcaseTemplateIds(matches);
    });
    return () => { cancelled = true; };
  }, [showcase]);

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
      {/* Session-expired notice — margin sized to absorb the hero section's
          own -mt-6/-mt-8 bleed just below (see that section's comment)
          without the two overlapping. Only ever shown right after the
          route-protection effect in App.tsx redirects here because a demo
          account was deleted out from under an active session. */}
      {sessionExpiredNotice && (
        <div
          role="status"
          className="mb-8 sm:mb-10 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <Clock size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
          <p className="flex-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
            Your demo session has expired and its data has been cleared. Start another demo, or plan a trip of your own.
          </p>
          <button
            onClick={onDismissSessionExpiredNotice}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1 text-amber-700/60 transition hover:bg-glass/5 hover:text-amber-800 dark:text-amber-300/60 dark:hover:text-amber-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Not another full regeneration</span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center">
            <h1
              className="font-display max-w-5xl text-3xl leading-[0.98] tracking-tight text-white animate-slide-up sm:text-5xl lg:text-6xl"
              style={{ textShadow: '0 2px 3px rgba(0,0,0,0.55), 0 16px 50px rgba(0,0,0,0.4)' }}
            >
              <span className="block font-500 text-white/80">One change</span>
              {/* `text-hero`'s fixed 3.75rem floor (tuned for "CHANGES") lets
                  this 2-characters-longer word run past the viewport edge on
                  narrow phones instead of shrinking further — this inline
                  override lowers just the floor so the same 13vw fluid
                  scaling takes over sooner, with no effect at the sm+ widths
                  where the original clamp already governed. */}
              <span
                className="font-hero block w-full uppercase text-white"
                style={{ fontSize: 'clamp(1.75rem, 13vw, 10.5rem)', lineHeight: 0.95, letterSpacing: '-0.03em', fontWeight: 800 }}
              >
                Shouldn't
              </span>
              <span className="block font-700 text-xl sm:text-3xl lg:text-4xl">rebuild your whole trip.</span>
            </h1>
            <p
              className="mx-auto mt-6 max-w-xl text-base text-white/90 leading-relaxed animate-slide-up sm:text-lg"
              style={{ animationDelay: '80ms', textShadow: '0 1px 3px rgba(0,0,0,0.65), 0 10px 34px rgba(0,0,0,0.5)' }}
            >
              Change a hotel or swap a day, and most AI planners start over from scratch. Planora replans only what's affected, keeps what you've locked untouched, and shows the exact cost delta so you know what changed — and why.
            </p>
          </div>
        </div>

        <motion.div
          className="card relative z-10 mx-4 -mt-14 max-w-2xl p-5 shadow-pop animate-scale-in sm:mx-auto sm:-mt-16 sm:p-6"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              {isDemo ? (
                // Already in a demo session — "Start Planning" (AI generation) is
                // blocked for demo accounts, and launching a second demo account
                // on top of this one would just compound the exact account-bloat
                // problem the demo lifecycle is designed to avoid.
                <button
                  onClick={() => onNavigate({ name: 'browse-templates' })}
                  className="btn-primary text-base px-6 py-2.5 w-full sm:w-auto"
                >
                  Browse suggested plans <ArrowRight size={16} />
                </button>
              ) : (
                <>
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
                </>
              )}
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

      {/* ─── 01 — Adaptive replanning & locked activities ───
          Leads the capability sections (not just first in DOM order) —
          this is the hero's own claim ("one change SHOULDN'T rebuild your
          whole trip"), so it's the first thing a scrolling visitor sees
          backed up in more detail, not a random pick from the feature set. */}
      <section className="pt-24 pb-20 sm:pt-32 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="section-eyebrow mb-6">01 — Adaptive replanning</div>
            <motion.h2
              {...revealProps}
              variants={revealUp}
              className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
            >
              Lock what matters. Replan the rest.
            </motion.h2>
            <motion.p
              {...revealProps}
              variants={revealUp}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-md text-ink-600 leading-relaxed"
            >
              Mark any activity as locked and Planora will never touch it, no matter how much else changes around it. Every replan shows a real before-and-after cost, so you always know exactly what shifted and why.
            </motion.p>
            <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }} className="mt-7">
              <button onClick={() => onNavigate({ name: 'create' })} className="btn-primary text-sm px-5 py-2.5">
                Start Planning <ArrowRight size={14} />
              </button>
            </motion.div>
          </div>

          <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }}>
            <div className="card overflow-hidden p-0">
              <img
                src="/image/landing-locked-activities.jpg"
                alt="A locked activity (with an Unlock action) sitting next to an unlocked one in a trip's day view"
                className="aspect-[4/3] w-full object-cover object-top"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 02 — Suggested trip plans ─── */}
      <section className="pt-20 pb-24 sm:pt-24">
        <div className="section-eyebrow mb-6">02 — Suggested trip plans</div>
        <motion.h2
          {...revealProps}
          variants={revealUp}
          className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
        >
          Don't start from a blank page.
        </motion.h2>
        <motion.p
          {...revealProps}
          variants={revealUp}
          transition={{ delay: 0.05 }}
          className="mt-4 max-w-md text-ink-600 leading-relaxed"
        >
          Browse AI-built itineraries for 180+ destinations, reviewed before they ever go live. Open one that's close to what you want, then make it yours — editing it copies the plan into your own trips.
        </motion.p>

        <motion.div
          {...revealProps}
          transition={{ staggerChildren: 0.06, delayChildren: 0.1 }}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5"
        >
          {showcase.map((d) => {
            const templateId = showcaseTemplateIds[d.name];
            return (
              <motion.div key={d.name} variants={revealUp}>
                <DestinationPlanCard
                  name={d.name}
                  region={d.region}
                  description={d.essence}
                  photoQuery={`${d.name}, ${d.region}`}
                  images={d.images}
                  onClick={templateId ? () => onNavigate({ name: 'template', templateId }) : undefined}
                />
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.15 }} className="mt-8 flex justify-center sm:justify-start">
          <button
            onClick={() => onNavigate({ name: 'browse-templates' })}
            className="btn-ghost text-sm"
          >
            See more suggested trip plans <ArrowRight size={14} />
          </button>
        </motion.div>
      </section>

      {/* ─── 03 — AI concierge editing ─── */}
      <section className="pt-20 pb-20 sm:pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="lg:order-2">
            <div className="section-eyebrow mb-6">03 — AI concierge</div>
            <motion.h2
              {...revealProps}
              variants={revealUp}
              className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
            >
              Just tell it what to change.
            </motion.h2>
            <motion.p
              {...revealProps}
              variants={revealUp}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-md text-ink-600 leading-relaxed"
            >
              Chat with your trip's concierge to swap an activity, rebalance your budget, or ease the pace. It proposes the change and explains its reasoning before anything is applied.
            </motion.p>
          </div>

          <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }} className="lg:order-1">
            <div className="card overflow-hidden p-0">
              <img
                src="/image/landing-ai-concierge.jpg"
                alt="A real exchange in the Ask Planora concierge panel, asking what scams to avoid in Tokyo and getting a real answer"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── 04 — Demo mode ─── */}
      <section className="pt-20 pb-24 sm:pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="section-eyebrow mb-6">04 — Demo mode</div>
            <motion.h2
              {...revealProps}
              variants={revealUp}
              className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
            >
              Try it before you commit.
            </motion.h2>
            <motion.p
              {...revealProps}
              variants={revealUp}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-md text-ink-600 leading-relaxed"
            >
              Explore a fully seeded trip with no account setup required. Demo sessions skip trip-creation limits and settings, and stay active for a limited time before their data clears automatically.
            </motion.p>
            {!isDemo && (
              <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }} className="mt-7">
                <button
                  onClick={handleTryDemo}
                  disabled={demoLoading}
                  className="btn border border-glass/15 text-sm px-5 py-2.5"
                >
                  {demoLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Preparing…</>
                    : <>Try Demo <ArrowRight size={14} /></>
                  }
                </button>
                {demoError && (
                  <p className="mt-2 text-xs text-rose-700 dark:text-rose-400">{demoError}</p>
                )}
              </motion.div>
            )}
          </div>

          <motion.div {...revealProps} variants={revealUp} transition={{ delay: 0.1 }}>
            <div className="card overflow-hidden p-0">
              <img
                src="/image/landing-demo-trip.jpg"
                alt="The seeded Tokyo Discovery demo trip, showing its destination hero and day-by-day itinerary tabs"
                className="aspect-[4/3] w-full object-cover object-top"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="pt-20 pb-24 sm:pt-24">
        <motion.h2
          {...revealProps}
          variants={revealUp}
          className="font-display max-w-lg text-3xl font-700 leading-[1.1] tracking-tight text-ink-900 sm:text-4xl"
        >
          Questions, answered.
        </motion.h2>

        <motion.div
          {...revealProps}
          variants={revealUp}
          transition={{ delay: 0.05 }}
          className="card mt-10 divide-y divide-glass/10 overflow-hidden p-0"
        >
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </motion.div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section className="pt-0 pb-28">
        <motion.div
          {...revealProps}
          variants={revealUp}
          className="relative overflow-hidden rounded-card-lg p-10 text-center shadow-glow sm:p-14"
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
              onClick={() => onNavigate(isDemo ? { name: 'browse-templates' } : { name: 'create' })}
              className="btn-primary mt-8 text-sm px-6 py-2.5 mx-auto"
            >
              {isDemo ? <>Browse suggested plans <ArrowRight size={15} /></> : <>Plan your next trip <ArrowRight size={15} /></>}
            </button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/** Collapsed by default; each item manages its own open state (not an exclusive single-open accordion) since users may want to compare more than one answer at once. */
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
      >
        <span className="font-display text-sm font-700 text-ink-900 sm:text-base">{question}</span>
        <ChevronDown size={16} className={`shrink-0 text-ink-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="px-5 pb-4 text-sm text-ink-600 leading-relaxed sm:px-6">{answer}</p>
      )}
    </div>
  );
}