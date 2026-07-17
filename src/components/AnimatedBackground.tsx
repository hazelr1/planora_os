import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

interface Blob {
  color: string;
  size: number;
  start: { x: string; y: string };
  drift: { x: string[]; y: string[] };
  duration: number;
}

// Light mode: gentle, slowly drifting terracotta/travel-blue/sage blobs
// over the warm cream base — subtle ambient movement, not a prominent
// decorative layer. Colors match the --brand/--accent scale in index.css.
const LIGHT_BLOBS: Blob[] = [
  { color: 'rgba(206,89,28,0.10)', size: 620, start: { x: '5%', y: '-10%' }, drift: { x: ['5%', '18%', '5%'], y: ['-10%', '5%', '-10%'] }, duration: 26 },
  { color: 'rgba(30,47,68,0.08)', size: 560, start: { x: '70%', y: '10%' }, drift: { x: ['70%', '55%', '70%'], y: ['10%', '28%', '10%'] }, duration: 32 },
  { color: 'rgba(141,149,126,0.12)', size: 480, start: { x: '30%', y: '65%' }, drift: { x: ['30%', '45%', '30%'], y: ['65%', '48%', '65%'] }, duration: 22 },
];

// Dark mode: deep navy with rich blue and turquoise ambient glow — kept
// entirely within that family so the AI copilot's violet accent (see
// .ai-surface in index.css) stays visually distinct from the app's own
// background atmosphere.
const DARK_BLOBS: Blob[] = [
  { color: 'rgba(42,199,205,0.09)', size: 700, start: { x: '10%', y: '-15%' }, drift: { x: ['10%', '20%', '10%'], y: ['-15%', '-5%', '-15%'] }, duration: 34 },
  { color: 'rgba(45,130,235,0.10)', size: 620, start: { x: '85%', y: '0%' }, drift: { x: ['85%', '70%', '85%'], y: ['0%', '15%', '0%'] }, duration: 38 },
  { color: 'rgba(37,99,235,0.07)', size: 640, start: { x: '75%', y: '90%' }, drift: { x: ['75%', '60%', '75%'], y: ['90%', '78%', '90%'] }, duration: 30 },
  { color: 'rgba(13,132,150,0.06)', size: 500, start: { x: '0%', y: '55%' }, drift: { x: ['0%', '12%', '0%'], y: ['55%', '42%', '55%'] }, duration: 28 },
];

/**
 * Full-viewport animated backdrop, shared by every screen. Both themes read
 * as subtle, slow-drifting ambient light rather than a decorative layer —
 * light mode a soft turquoise/emerald wash over ivory, dark mode a rich
 * blue/turquoise glow against deep navy.
 *
 * Reduced motion is handled explicitly via Framer's `useReducedMotion`,
 * not the app's global CSS rule — that rule only forces CSS
 * animation/transition durations to ~0, and has no effect on Framer
 * Motion's `animate` prop, which drives its own loop outside CSS entirely.
 */
export default function AnimatedBackground() {
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const blobs = resolvedTheme === 'light' ? LIGHT_BLOBS : DARK_BLOBS;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            left: blob.start.x,
            top: blob.start.y,
            background: blob.color,
          }}
          animate={prefersReducedMotion ? undefined : { left: blob.drift.x, top: blob.drift.y }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
