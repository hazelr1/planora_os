import type { DestinationIllustrationStyle, DestinationIconStyle, MotifStroke, RGBTriplet } from '../../destinations';

interface DestinationMotifProps {
  strokes: MotifStroke[];
  className?: string;
  /** Defaults to 'regular' — matches the app's prior fixed 1.5 stroke width exactly, so every existing caller renders identically until it opts in. */
  strokeWeight?: DestinationIconStyle['strokeWeight'];
  /** Defaults to 'monochrome' — matches the app's prior verbatim-opacity, single-hue rendering exactly. */
  paletteBias?: DestinationIllustrationStyle['paletteBias'];
  /** Required only for 'duotone' — alternates strokes between currentColor and this hue. */
  secondaryColor?: RGBTriplet;
  /** Accessible name for the motif, e.g. a decorative asset label. Purely additive — has no visual effect. */
  title?: string;
}

const STROKE_WIDTH: Record<DestinationIconStyle['strokeWeight'], number> = {
  thin: 1,
  regular: 1.5,
  bold: 2.2,
};

/** Multiplies every stroke's own opacity — palette bias is a mood shift on top of the recipe, never a rewrite of it. */
const OPACITY_MULTIPLIER: Record<DestinationIllustrationStyle['paletteBias'], number> = {
  monochrome: 1,
  duotone: 1,
  muted: 0.75,
  saturated: 1.2,
};

/**
 * A generic interpreter for a destination's `iconStyle.motif` recipe — a
 * handful of line/path/dot primitives at low opacity, used as a hero-banner
 * watermark and a small section-divider ornament. Rendering is entirely
 * data-driven: this component has no knowledge of "Santorini" or "Japan",
 * only of the strokes it's handed (see src/destinations/registry.ts for the
 * hand-authored recipes and src/destinations/undiscoveredProtocol.ts for how
 * an unfamiliar destination's motif gets composed the same way).
 */
export default function DestinationMotif({
  strokes, className, strokeWeight = 'regular', paletteBias = 'monochrome', secondaryColor, title,
}: DestinationMotifProps) {
  if (!strokes.length) return null;

  const baseStrokeWidth = STROKE_WIDTH[strokeWeight];
  const opacityMultiplier = OPACITY_MULTIPLIER[paletteBias];

  const strokeColorFor = (index: number): string | undefined => {
    if (paletteBias === 'duotone' && secondaryColor && index % 2 === 1) return `rgb(${secondaryColor})`;
    return undefined; // undefined lets the SVG-level stroke="currentColor" apply
  };

  return (
    <svg
      className={className}
      viewBox="0 0 200 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={baseStrokeWidth}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title && <title>{title}</title>}
      {strokes.map((stroke, i) => {
        const opacity = stroke.opacity !== undefined ? Math.min(1, stroke.opacity * opacityMultiplier) : undefined;
        const color = strokeColorFor(i);
        if (stroke.kind === 'path') {
          const filled = stroke.fill === 'currentColor';
          return (
            <path
              key={i}
              d={stroke.d}
              opacity={opacity}
              strokeWidth={stroke.strokeWidth}
              fill={filled ? (color ?? 'currentColor') : undefined}
              stroke={filled ? 'none' : color}
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
              opacity={opacity}
              strokeWidth={stroke.strokeWidth}
              stroke={color}
            />
          );
        }
        return (
          <circle
            key={i}
            cx={stroke.cx}
            cy={stroke.cy}
            r={stroke.r}
            opacity={opacity}
            fill={stroke.filled ? (color ?? 'currentColor') : undefined}
            stroke={stroke.filled ? 'none' : color}
          />
        );
      })}
    </svg>
  );
}
