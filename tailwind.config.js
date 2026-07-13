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
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
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
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.04)',
        card: '0 4px 24px -4px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.06)',
        pop: '0 20px 60px -12px rgba(0,0,0,0.55), 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 32px -8px rgba(34,211,238,0.16)',
        'glow-lg': '0 8px 40px -8px rgba(34,211,238,0.22), 0 0 60px -20px rgba(139,92,246,0.25)',
        'glow-violet': '0 0 0 1px rgba(167,139,250,0.25), 0 0 32px -6px rgba(139,92,246,0.35)',
        'card-hover': '0 16px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
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
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 1px rgba(167,139,250,0.2), 0 0 20px -4px rgba(139,92,246,0.25)' },
          '50%': { boxShadow: '0 0 0 1px rgba(167,139,250,0.4), 0 0 32px -2px rgba(139,92,246,0.45)' },
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
        'fade-in': 'fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        float: 'float 3.5s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
