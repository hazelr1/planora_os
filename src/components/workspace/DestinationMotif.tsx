import type { MotifStroke } from '../../destinations';

interface DestinationMotifProps {
  strokes: MotifStroke[];
  className?: string;
}

/**
 * A generic interpreter for a destination's `iconStyle.motif` recipe — a
 * handful of line/path/dot primitives at low opacity, used as a hero-banner
 * watermark and a small section-divider ornament. Rendering is entirely
 * data-driven: this component has no knowledge of "Santorini" or "Japan",
 * only of the strokes it's handed (see src/destinations/registry.ts for the
 * hand-authored recipes and src/destinations/undiscoveredProtocol.ts for how
 * an unfamiliar destination's motif gets composed the same way).
 */
export default function DestinationMotif({ strokes, className }: DestinationMotifProps) {
  if (!strokes.length) return null;

  return (
    <svg
      className={className}
      viewBox="0 0 200 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      xmlns="http://www.w3.org/2000/svg"
    >
      {strokes.map((stroke, i) => {
        if (stroke.kind === 'path') {
          const filled = stroke.fill === 'currentColor';
          return (
            <path
              key={i}
              d={stroke.d}
              opacity={stroke.opacity}
              strokeWidth={stroke.strokeWidth}
              fill={filled ? 'currentColor' : undefined}
              stroke={filled ? 'none' : undefined}
            />
          );
        }
        if (stroke.kind === 'line') {
          return (
            <line
              key={i}
              x1={stroke.x1}
              y1={stroke.y1}
              x2={stroke.x2}
              y2={stroke.y2}
              opacity={stroke.opacity}
              strokeWidth={stroke.strokeWidth}
            />
          );
        }
        return (
          <circle
            key={i}
            cx={stroke.cx}
            cy={stroke.cy}
            r={stroke.r}
            opacity={stroke.opacity}
            fill={stroke.filled ? 'currentColor' : undefined}
            stroke={stroke.filled ? 'none' : undefined}
          />
        );
      })}
    </svg>
  );
}
