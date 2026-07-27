/** @type {import('tailwindcss').Config} */
function themeVar(name) {
  return ({ opacityValue }) =>
    opacityValue === undefined ? `rgb(var(--${name}))` : `rgb(var(--${name}) / ${opacityValue})`;
}

function scale(prefix) {
  return Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, themeVar(`${prefix}-${k}`)]),
  );
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        // Clean, humanist workhorse for body/UI text — legible at small
        // sizes, quiet enough to let the display face carry personality.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Fraunces replaces Plus Jakarta Sans as the display face: a
        // editorial serif with real character (soft, slightly warm optical
        // curves) — the kind of typeface luxury travel print and Aman-style
        // hospitality branding actually use, rather than another geometric
        // sans that reads as "generic SaaS." Used for headings and large
        // numerals only, never body copy.
        display: ['Fraunces', 'Georgia', 'ui-serif', 'serif'],
        // Condensed display face reserved for oversized hero-scale wordmark
        // moments (text-6xl+) sitting directly over a photo — a distinct
        // register from Fraunces, not a replacement for it.
        wordmark: ['Bebas Neue', 'Fraunces', 'ui-serif', 'serif'],
        // Heavy-weight, tight-tracking grotesk for hero-scale headline text
        // — a third, distinct register from both Fraunces (editorial serif)
        // and Inter (body/UI). Pairs with the `hero` fontSize below. Not yet
        // wired into any component.
        hero: ['"Space Grotesk"', '"Inter Tight"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Full-bleed hero headline scale — fluid between mobile and
        // ultra-wide, tight leading/tracking for a heavy display face.
        // Calibrated against its first real usage (Landing hero "CHANGES"):
        // the initial clamp(3.5rem, 8vw, 7rem) read as just a bigger line,
        // not a dominant one, so the vw factor and ceiling were raised to
        // actually command the container at desktop widths while keeping
        // the mobile floor safe for a single uppercase word.
        hero: ['clamp(3.75rem, 13vw, 10.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '800' }],
      },
      // Numeric font-weight utilities. Extends (never replaces) Tailwind's
      // named scale — font-medium/font-semibold/font-normal keep working —
      // but the app's own components have always written font-600/700/800
      // directly, and Tailwind never generated those classes: there was no
      // fontWeight entry for them, so every one of those 87 declarations
      // across the codebase was silently a no-op. This is the fix, and it
      // requires touching no component file — every heading that already
      // asked for font-800 starts actually rendering at 800 the moment this
      // ships.
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        800: '800',
        900: '900',
      },
      // Centralized radius/container/transition tokens — previously several
      // components reached for arbitrary one-off values (rounded-[28px],
      // duration-[400ms]) instead of a shared scale. These don't change any
      // page's composition on their own; they give existing and future
      // component work a named value to reach for instead of a magic number.
      borderRadius: {
        // Dialed down from the previous 16px/28px one-off values — calmer,
        // less "bubble," while staying a soft (never sharp) corner.
        card: '0.875rem',
        'card-lg': '1.25rem',
      },
      maxWidth: {
        narrow: '28rem',
        content: '48rem',
        wide: '64rem',
      },
      transitionDuration: {
        control: '200ms',
        card: '350ms',
      },
      colors: {
        // Every shade below resolves through a CSS variable (see index.css),
        // so switching data-theme="light"/"dark" on <html> re-themes the
        // entire app without touching component classNames. `glass` is the
        // theme-aware stand-in for what used to be hardcoded `white/NN`
        // overlay utilities (borders, subtle hover backgrounds) — it's
        // literal white in dark mode and a soft ink tone in light mode, so
        // glass borders/hovers read correctly against either background.
        ink: scale('ink'),
        brand: scale('brand'),
        violet: scale('violet'),
        glass: themeVar('glass'),
        // Muted amber/gold warm-neutral accent — same value in both themes
        // (see --gold-accent in index.css). For overline labels and
        // dividers only, used sparingly, never as a primary color.
        gold: themeVar('gold-accent'),
        // AI accent (cyan → violet) — reserved for AI-specific moments
        // only (see the --ai-cyan/--ai-violet comment in index.css), never
        // general chrome. Each resolves through its own theme-aware CSS
        // variable, same mechanism as brand/violet above.
        'ai-cyan': themeVar('ai-cyan'),
        'ai-violet': themeVar('ai-violet'),
      },
      // Shadow values are CSS variables (see index.css) rather than static
      // strings, so light mode gets warm, low-contrast elevation suited to
      // an ivory ground and dark mode keeps its deeper, glow-capable
      // shadows — "elegant shadows instead of harsh borders" means
      // something different on each background, and a single flat rgba
      // value can't serve both.
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        pop: 'var(--shadow-pop)',
        glow: 'var(--shadow-glow)',
        'glow-lg': 'var(--shadow-glow-lg)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'dot-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        // Slightly slower than before across the board — premium motion
        // reads as considered rather than snappy; the easing curve itself
        // (a gentle overshoot-free ease-out) is unchanged.
        'fade-in': 'fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        float: 'float 3.5s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
