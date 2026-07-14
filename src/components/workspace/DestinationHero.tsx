import { motion, useReducedMotion } from 'framer-motion';
import { CloudSun, Sun } from 'lucide-react';
import type { ExperienceCopy, ExperienceTokens } from '../../destinations';
import { getTextureBackgroundImage, getTextureOpacity } from '../../destinations';
import DestinationMotif from './DestinationMotif';

interface DestinationHeroProps {
  tokens: ExperienceTokens;
  copy: ExperienceCopy;
  destination: string;
}

/**
 * The editorial destination hero — the first thing a themed Trip Workspace
 * shows. Replaces the old compact DestinationHeroBanner strip; this is
 * meant to be the "you have already arrived" moment the brief asks for,
 * not a decorative accent.
 *
 * There are no photo assets anywhere in this app (confirmed by audit), so
 * "stunning destination imagery" is composed entirely from tokens: the
 * gradient scene, a large watermark of the destination's own motif, a
 * slow-drifting ambient glow whose pace comes from `tokens.motion` (so
 * Santorini's glow moves differently than Dubai's, without either being
 * hardcoded here), and a barely-there texture overlay. Every value drawn
 * from `tokens`/`copy` — this component has no idea Santorini exists.
 *
 * The destination *name* renders as a styled `<p>`, not an `<h1>` — the
 * page's one `<h1>` is the trip's own title in Workspace.tsx just below.
 * Two `<h1>`s on one page breaks the document outline for screen readers;
 * this is a masthead, not the page's primary heading.
 */
export default function DestinationHero({ tokens, copy, destination }: DestinationHeroProps) {
  const textureImage = getTextureBackgroundImage(tokens.textureStyle);
  const textureOpacity = getTextureOpacity(tokens.glassIntensity);
  const prefersReducedMotion = useReducedMotion();

  // Motion tokens are tuned for one-shot UI transitions (0.3–0.8s); ambient
  // background drift needs to be much slower. Scaling the same preset's
  // duration keeps the destination's motion *character* (its easing curve)
  // intact while giving it an appropriately unhurried, premium pace —
  // opulent destinations drift slower than crisp ones, exactly as they
  // should.
  const ambientDuration = (typeof tokens.motion.transition.duration === 'number' ? tokens.motion.transition.duration : 0.5) * 50;

  return (
    <section className="relative overflow-hidden rounded-[28px] shadow-pop mb-6 animate-fade-in">
      {/* Layer 1 — the gradient scene, standing in for a photograph */}
      <div className="absolute inset-0" style={{ backgroundImage: tokens.gradients.hero }} />

      {/* Layer 2 — slow ambient glow, destination-paced. The app's global
          CSS reduced-motion rule only covers CSS animations/transitions —
          Framer Motion's `animate` prop runs its own JS-driven loop that
          rule never touches, so this checks the same media query directly
          via Framer's own `useReducedMotion` and renders the glow static
          instead of looping when the user has asked for less motion. */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-1/3 -right-1/4 h-[160%] w-3/4 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, rgb(${tokens.colors.accentSoft} / 0.35) 0%, transparent 70%)` }}
        animate={prefersReducedMotion ? undefined : { x: [0, 22, 0], y: [0, -14, 0] }}
        transition={{ duration: ambientDuration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Layer 3 — barely-there texture, unique per destination, never louder than this */}
      {textureImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: textureImage, backgroundRepeat: 'repeat', opacity: textureOpacity }}
        />
      )}

      {/* Layer 4 — large motif watermark, the destination's own line art */}
      <DestinationMotif
        strokes={tokens.iconTreatment.motif}
        className="absolute right-0 bottom-0 h-2/3 w-2/3 sm:w-1/2 text-white/[0.16]"
      />

      {/* Layer 5 — scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

      {/* Content. Essence, quote, and mood tags all carried the same
          "atmosphere" idea in three forms (a descriptive sentence, an
          italic pull-quote, and a row of tag chips) — busier than an
          editorial hero should be, and the tag-chip row in particular read
          closer to dashboard UI than magazine copy. Essence + quote alone
          carry the emotional weight; mood stays a real field on the copy
          model for any future surface that wants it, just not rendered
          three times over in one hero. */}
      <div className="relative flex min-h-[300px] sm:min-h-[360px] flex-col justify-end p-6 sm:p-10">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          {copy.region ?? destination}
        </p>
        <p className="font-display mb-3 max-w-xl text-4xl font-500 text-white sm:text-5xl">
          {copy.name}
        </p>
        <p className="mb-3 max-w-lg text-sm text-white/80 sm:text-base">
          {copy.essence}
        </p>
        {copy.quote && (
          <p className="font-display mb-5 max-w-md text-base italic text-white/90 sm:text-lg">
            &ldquo;{copy.quote}&rdquo;
          </p>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-3 text-white/85">
          {copy.bestSeason && (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Sun size={14} className="shrink-0 text-white/70" />
              <span>
                <span className="text-white/60">Best time to visit — </span>
                {copy.bestSeason}
              </span>
            </div>
          )}
          {copy.weatherHint && (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <CloudSun size={14} className="shrink-0 text-white/70" />
              <span>
                <span className="text-white/60">Typical weather — </span>
                {copy.weatherHint}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
