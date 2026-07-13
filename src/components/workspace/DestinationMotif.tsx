import type { DestinationThemeId } from './destinationThemes';

interface DestinationMotifProps {
  theme: DestinationThemeId;
  className?: string;
}

/**
 * A single elegant, minimal line-art motif per destination — used at low
 * opacity as a hero-banner watermark and small as a section-divider
 * ornament. Deliberately restrained (a handful of strokes, no clip-art
 * detail, no color of its own — always `currentColor`) so it reads as
 * premium texture rather than a cartoon illustration.
 */
export default function DestinationMotif({ theme, className }: DestinationMotifProps) {
  const common = { className, viewBox: '0 0 200 100', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };

  switch (theme) {
    case 'santorini':
      // Whitewashed dome + cross, a wave beneath for the Aegean.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <path d="M60 70 a30 30 0 0 1 60 0" />
          <line x1="60" y1="70" x2="120" y2="70" />
          <line x1="90" y1="40" x2="90" y2="22" />
          <line x1="82" y1="28" x2="98" y2="28" />
          <path d="M0 88 Q 25 78 50 88 T 100 88 T 150 88 T 200 88" strokeWidth={1} opacity={0.6} />
        </svg>
      );
    case 'japan':
      // Torii gate silhouette with a couple of drifting blossom marks.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <line x1="55" y1="30" x2="55" y2="85" />
          <line x1="145" y1="30" x2="145" y2="85" />
          <line x1="40" y1="30" x2="160" y2="30" />
          <line x1="48" y1="42" x2="152" y2="42" />
          <circle cx="30" cy="55" r="2.2" fill="currentColor" stroke="none" opacity={0.7} />
          <circle cx="172" cy="65" r="2.2" fill="currentColor" stroke="none" opacity={0.6} />
          <circle cx="180" cy="50" r="1.6" fill="currentColor" stroke="none" opacity={0.5} />
        </svg>
      );
    case 'italy':
      // Slim cypress silhouette beside a simple citrus branch curve.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <path d="M70 85 C 60 70, 80 65, 70 50 C 82 45, 60 35, 70 22 L 70 85 Z" />
          <path d="M120 80 Q 145 60 170 70" />
          <circle cx="150" cy="66" r="4" />
          <circle cx="163" cy="72" r="3.2" />
        </svg>
      );
    case 'switzerland':
      // Overlapping alpine peaks.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <path d="M20 82 L55 35 L80 62 L100 30 L130 82 Z" />
          <path d="M95 82 L128 45 L165 82 Z" opacity={0.7} />
        </svg>
      );
    case 'dubai':
      // A single tapered spire with a lattice accent.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <path d="M100 15 L108 80 L92 80 Z" />
          <line x1="70" y1="80" x2="130" y2="80" />
          <path d="M60 80 L100 45 L140 80" opacity={0.55} />
        </svg>
      );
    case 'iceland':
      // Flowing aurora bands.
      return (
        <svg {...common} stroke="currentColor" strokeWidth={1.5}>
          <path d="M10 40 Q 60 10 110 35 T 190 30" />
          <path d="M10 58 Q 60 30 110 55 T 190 50" opacity={0.7} />
          <path d="M10 76 Q 60 52 110 74 T 190 70" opacity={0.45} />
        </svg>
      );
    default:
      return null;
  }
}
