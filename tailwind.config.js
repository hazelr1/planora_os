/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#080b16',
          100: '#0e131f',
          200: '#161d2c',
          300: '#212a3d',
          400: '#5b6885',
          500: '#7e8ba5',
          600: '#9ca7be',
          700: '#bcc6d8',
          800: '#dae0eb',
          900: '#eff2f8',
          950: '#ffffff',
        },
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.04)',
        card: '0 4px 24px -4px rgba(0,0,0,0.3), 0 0 1px rgba(255,255,255,0.06)',
        pop: '0 12px 40px -8px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.08)',
        glow: '0 0 32px -8px rgba(34,211,238,0.12)',
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
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
