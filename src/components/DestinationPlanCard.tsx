import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getDestinationPhoto } from '../services/destinationImages';
import { pickDaily } from '../lib/dailyRotation';

interface DestinationPlanCardProps {
  name: string;
  region: string;
  description: string;
  /** Text passed to getDestinationPhoto when `images` isn't supplied — normally the full "City, Country" destination string. */
  photoQuery: string;
  /** Local curated images to rotate between (see dailyRotation) — skips the network photo lookup entirely when supplied. */
  images?: string[];
  onClick?: () => void;
}

/**
 * The one image-forward "suggested trip plan" card — photo, destination
 * name, short description, arrow. Used both by the landing page's
 * destination showcase and the full Suggested Trip Plans grid, so the two
 * surfaces read as one consistent picker rather than two different card
 * styles. Photos come from either a curated local set (`images`, rotated
 * via pickDaily) or, for destinations without one, a live lookup via
 * getDestinationPhoto — same resolution chain DestinationHero uses,
 * so every card renders a real photo without needing one bundled for
 * every possible destination.
 */
export default function DestinationPlanCard({ name, region, description, photoQuery, images, onClick }: DestinationPlanCardProps) {
  const [dynamicSrc, setDynamicSrc] = useState<string | null>(null);

  useEffect(() => {
    if (images && images.length > 0) return;
    let cancelled = false;
    getDestinationPhoto(photoQuery).then((photo) => {
      if (!cancelled && photo) setDynamicSrc(photo.url);
    });
    return () => { cancelled = true; };
  }, [images, photoQuery]);

  const src = images && images.length > 0 ? pickDaily(images, name) : dynamicSrc;
  const Card = onClick ? 'button' : 'div';

  return (
    <Card
      onClick={onClick}
      className={`card group relative aspect-[4/5] w-full overflow-hidden p-0 text-left shadow-pop transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-glow-lg${onClick ? ' card-interactive' : ''}`}
    >
      {src ? (
        <img
          src={src}
          alt={`${name}, ${region}`}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="skeleton absolute inset-0" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/70">{region}</p>
        <p className="font-display mt-1 flex items-center gap-1.5 text-xl font-600 text-white">
          <span className="truncate">{name}</span>
          {onClick && (
            <ArrowRight size={15} className="shrink-0 opacity-80 transition-transform duration-300 group-hover:translate-x-0.5" />
          )}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/75 line-clamp-2">{description}</p>
      </div>
    </Card>
  );
}
