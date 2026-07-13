import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

interface Blob {
  color: string;
  size: number;
  start: { x: string; y: string };
  drift: { x: string[]; y: string[] };
  duration: number;
}

// Light mode: prominent, slowly drifting turquoise/emerald/sea-green blobs
// over the ivory/cream base — the "animated moving gradient blobs" look.
const LIGHT_BLOBS: Blob[] = [
  { color: 'rgba(20,184,166,0.22)', size: 620, start: { x: '5%', y: '-10%' }, drift: { x: ['5%', '18%', '5%'], y: ['-10%', '5%', '-10%'] }, duration: 26 },
  { color: 'rgba(5,150,105,0.18)', size: 560, start: { x: '70%', y: '10%' }, drift: { x: ['70%', '55%', '70%'], y: ['10%', '28%', '10%'] }, duration: 32 },
  { color: 'rgba(94,224,202,0.20)', size: 480, start: { x: '30%', y: '65%' }, drift: { x: ['30%', '45%', '30%'], y: ['65%', '48%', '65%'] }, duration: 22 },
];

// Dark mode: the existing subtler ambient glow, kept gently animated rather
// than static.
const DARK_BLOBS: Blob[] = [
  { color: 'rgba(34,211,238,0.09)', size: 700, start: { x: '10%', y: '-15%' }, drift: { x: ['10%', '20%', '10%'], y: ['-15%', '-5%', '-15%'] }, duration: 34 },
  { color: 'rgba(59,130,246,0.08)', size: 620, start: { x: '85%', y: '0%' }, drift: { x: ['85%', '70%', '85%'], y: ['0%', '15%', '0%'] }, duration: 38 },
  { color: 'rgba(139,92,246,0.07)', size: 640, start: { x: '75%', y: '90%' }, drift: { x: ['75%', '60%', '75%'], y: ['90%', '78%', '90%'] }, duration: 30 },
  { color: 'rgba(124,58,237,0.05)', size: 500, start: { x: '0%', y: '55%' }, drift: { x: ['0%', '12%', '0%'], y: ['55%', '42%', '55%'] }, duration: 28 },
];

/**
 * Full-viewport animated backdrop, shared by every screen. Swaps blob count/
 * intensity/motion by theme rather than just color, per the design brief:
 * light mode is meant to read as visibly moving gradient blobs, dark mode as
 * a subtle ambient glow. Respects prefers-reduced-motion via the global CSS
 * rule (animation-duration is forced to ~0 there).
 */
export default function AnimatedBackground() {
  const { resolvedTheme } = useTheme();
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
          animate={{ left: blob.drift.x, top: blob.drift.y }}
          transition={{ duration: blob.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
