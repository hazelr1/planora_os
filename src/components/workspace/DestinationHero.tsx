import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CloudSun, Sun } from 'lucide-react';
import type { ExperienceCopy, ExperienceTokens } from '../../destinations';
import { getTextureBackgroundImage, getTextureOpacity } from '../../destinations';
import { getDestinationPhoto, type DestinationPhoto } from '../../services/destinationImages';
import DestinationMotif from './DestinationMotif';

interface DestinationHeroProps {
  tokens: ExperienceTokens;
  copy: ExperienceCopy;
  destination: string;
}

/**
 * The editorial destination hero — the first thing a themed Trip Workspace
 * shows. Replaces the old compact DestinationHeroBanner strip; this is
 * meant to be a "you have already arrived" moment, not a decorative accent —
 * sized (aspect-ratio + max-height, not an open-ended min-height) so it never
 * pushes the itinerary below the fold, especially on mobile.
 *
 * The fallback scene is composed entirely from tokens — a gradient, a large
 * watermark of the destination's own motif, a slow-drifting ambient glow
 * whose pace comes from `tokens.motion` (so Santorini's glow moves
 * differently than Dubai's, without either being hardcoded here), and a
 * barely-there texture overlay — and renders immediately with no loading
 * flash. A real photo (see services/destinationImages.ts) is a progressive
 * enhancement layered on top once/if one resolves; the gradient scene is the
 * permanent fallback, never an error state. The glow/texture atmosphere is
 * fallback-only (see `showFallbackAtmosphere`) — once a real photo is
 * showing, it does the emotional work alone, without decoration competing
 * on top of it. Every value drawn from `tokens`/`copy`/`destination` — this
 * component has no idea Santorini exists.
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
  const [photo, setPhoto] = useState<DestinationPhoto | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    setPhotoFailed(false);
    getDestinationPhoto(destination).then((resolved) => {
      if (!cancelled) setPhoto(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [destination]);

  // Motion tokens are tuned for one-shot UI transitions (0.3–0.8s); ambient
  // background drift needs to be much slower. Scaling the same preset's
  // duration keeps the destination's motion *character* (its easing curve)
  // intact while giving it an appropriately unhurried, premium pace —
  // opulent destinations drift slower than crisp ones, exactly as they
  // should.
  const ambientDuration = (typeof tokens.motion.transition.duration === 'number' ? tokens.motion.transition.duration : 0.5) * 50;

  // A real photo is doing the emotional work once one resolves — the
  // gradient scene's own atmosphere (ambient glow, texture) exists to make
  // the *fallback* feel intentional, not to layer on top of real
  // photography. Stacking both reads as over-decorated, not premium.
  const showFallbackAtmosphere = !photo || photoFailed;

  return (
    <section className="relative overflow-hidden rounded-card-lg shadow-pop mb-6 animate-fade-in aspect-[4/3] sm:aspect-[21/9] max-h-[260px] sm:max-h-[320px]">
      {/* Layer 1 — the gradient scene, standing in for a photograph. Always
          rendered immediately, with no loading flash — this is the
          permanent fallback, not a placeholder for Layer 1b below. */}
      <div className="absolute inset-0" style={{ backgroundImage: tokens.gradients.hero }} />

      {/* Layer 1b — a real photo, cross-faded in on top once one resolves.
          Progressive enhancement only: if it never resolves (no API keys,
          no results, a network failure) or fails to load (onError), the
          gradient above is all that ever renders — never a broken image
          icon or an error state. width/height hint the browser to the
          intrinsic aspect ratio before the image loads, preventing layout
          shift. */}
      {photo && !photoFailed && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.9, ease: 'easeOut' }}
        >
          <img
            src={photo.url}
            alt={photo.alt}
            width={1600}
            height={900}
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="h-full w-full object-cover"
          />
        </motion.div>
      )}
      {/* Photo-source attribution — Pexels' API terms require a visible
          credit/link; shown for Pixabay too for consistency. Never shown
          for curated/fallback images, which aren't sourced from either API. */}
      {photo && !photoFailed && (photo.source === 'pexels' || photo.source === 'pixabay') && (
        <a
          href={photo.photographerUrl ?? (photo.source === 'pexels' ? 'https://www.pexels.com' : 'https://pixabay.com')}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-3 z-10 text-[10px] text-white/50 hover:text-white/85 transition"
        >
          Photo{photo.photographer ? ` by ${photo.photographer}` : ''} via {photo.source === 'pexels' ? 'Pexels' : 'Pixabay'}
        </a>
      )}

      {/* Layer 2 — slow ambient glow, destination-paced. Only rendered over
          the procedural fallback scene (see showFallbackAtmosphere above) —
          real photography doesn't need an animated gradient competing with
          it. The app's global CSS reduced-motion rule only covers CSS
          animations/transitions — Framer Motion's `animate` prop runs its
          own JS-driven loop that rule never touches, so this checks the
          same media query directly via Framer's own `useReducedMotion` and
          renders the glow static instead of looping when the user has
          asked for less motion. */}
      {showFallbackAtmosphere && (
        <motion.div
          aria-hidden="true"
          className="absolute -top-1/3 -right-1/4 h-[160%] w-3/4 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, rgb(${tokens.colors.accentSoft} / 0.35) 0%, transparent 70%)` }}
          animate={prefersReducedMotion ? undefined : { x: [0, 22, 0], y: [0, -14, 0] }}
          transition={{ duration: ambientDuration, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Layer 3 — barely-there texture, unique per destination, never
          louder than this. Same reasoning as Layer 2: fallback-only. */}
      {showFallbackAtmosphere && textureImage && (
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ backgroundImage: textureImage, backgroundRepeat: 'repeat', opacity: textureOpacity }}
        />
      )}

      {/* Layer 4 — large motif watermark, the destination's own line art */}
      <DestinationMotif
        strokes={tokens.iconTreatment.motif}
        strokeWeight={tokens.iconTreatment.strokeWeight}
        paletteBias={tokens.illustrationPaletteBias}
        secondaryColor={tokens.colors.secondary}
        title={`${copy.name} motif`}
        className="absolute right-0 bottom-0 h-2/3 w-2/3 sm:w-1/2 text-white/[0.16]"
      />

      {/* Layer 5 — scrim for legibility. A graduated multi-stop black
          gradient (not the from/via/to shorthand) reaching further up the
          frame than before — the destination name now renders much larger
          (see below), so it spans higher into the photo than the old
          scrim's reach covered. Fixed, not theme-driven: this sits on a
          photo, never the app's own surface, and needs to hold contrast
          the same way against both a bright sky shot and a busy night shot
          like Tokyo. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.48) 30%, rgba(0,0,0,0.14) 60%, transparent 85%)' }}
      />

      {/* Content. Essence, quote, and mood tags all carried the same
          "atmosphere" idea in three forms (a descriptive sentence, an
          italic pull-quote, and a row of tag chips) — busier than an
          editorial hero should be, and the tag-chip row in particular read
          closer to dashboard UI than magazine copy. Essence + quote alone
          carry the emotional weight; mood stays a real field on the copy
          model for any future surface that wants it, just not rendered
          three times over in one hero. */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          {copy.region ?? destination}
        </p>
        {/* Destination name — the font-hero/tight-tracking recipe from the
            token pass, but sized with its own clamp rather than the literal
            `hero` fontSize token: that scale (up to 10.5rem) was built for a
            full-viewport landing hero, and this banner is height-capped at
            260–320px total including the essence, quote, and best-time
            rows beneath it, so the same size would overflow. This keeps the
            heavy-weight, tight-leading character while fitting the box.

            Single-line truncation (regression fix, 3rd pass — see git
            history for the two dead ends this replaced):
            - line-clamp-2 (`display: -webkit-box`) mis-measured the box for
              a single short line like "Dubai," so the essence sibling below
              it got positioned as if the name were shorter than what
              actually painted, overlapping it.
            - Fixing that by wrapping to 2 real lines (plain block,
              overflow-hidden + max-height) traded one bug for another:
              verified via outlined boxes that the box model was correct
              (a real, measured 16px gap to essence) — but this heavy
              700-weight face's *glyph ink* renders taller than a line-height
              under ~1.3 can contain, so line 2 visually spilled into
              essence regardless of the (correct) box spacing. Raising
              line-height to fix that then made the 2-line block taller than
              this component's fixed 260–320px section budget, clipping the
              *top* of line 2 against the section's own boundary instead.
            Two real lines at this weight/size simply don't fit this
            component's height budget. Single-line + ellipsis sidesteps the
            whole "second line" problem, and matches what real-trip testing
            (Tokyo, Santorini, Dubai — all short names) already proved
            clean at this line-height. Long AI-generated names (up to 80
            chars) just truncate with "…" instead of wrapping. */}
        <p
          className="font-hero mb-4 max-w-2xl overflow-hidden whitespace-nowrap text-ellipsis text-white"
          style={{ fontSize: 'clamp(1.75rem,6vw,3.75rem)', lineHeight: 1.15, letterSpacing: '-0.03em', textShadow: '0 1px 2px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.45)' }}
        >
          {copy.name}
        </p>
        <p className="mb-2.5 max-w-lg text-sm text-white/80 sm:text-base line-clamp-2">
          {copy.essence}
        </p>
        {/* The pull-quote is the one purely emotional flourish here — kept
            for larger screens where there's room, dropped on mobile so the
            hero stays short enough that the itinerary isn't pushed below
            the fold. Serif italic (font-display) is a deliberately distinct
            register from the name's heavy grotesk above it. */}
        {copy.quote && (
          <p
            className="hidden sm:block font-display font-500 mb-7 max-w-md text-lg italic text-white/90"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.45)' }}
          >
            &ldquo;{copy.quote}&rdquo;
          </p>
        )}

        <div className={`flex flex-wrap gap-x-6 gap-y-2 text-white/85 ${copy.quote ? '' : 'mt-2.5'}`}>
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
