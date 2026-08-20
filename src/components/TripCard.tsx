import { useEffect, useState } from 'react';
import { MapPin, Calendar, Wallet, Users, Copy, Trash2, ArrowRight, Clock, Pencil } from 'lucide-react';
import type { Trip } from '../types';
import { formatDateRange, formatLastUpdated } from '../utils/dates';
import { formatLocationLabel } from '../utils/text';
import { useExperienceTokens } from '../destinations';
import { getDestinationPhoto, type DestinationPhoto } from '../services/destinationImages';
import { generateTripICS, downloadICS } from '../utils/ics';

interface TripCardProps {
  trip: Trip;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

// Fixed (non-theme-driven) dot colors — this badge always sits on a photo,
// never the app's own surface, so it uses the same "black/40 pill, white
// text" treatment as the location pill below it rather than ink/brand
// tones that assume a themed background.
const statusDotColor: Record<string, string> = {
  Planning: 'bg-amber-400',
  Confirmed: 'bg-emerald-400',
  Completed: 'bg-slate-400',
};

export default function TripCard({ trip, onOpen, onEdit, onDuplicate, onDelete }: TripCardProps) {
  const { tokens } = useExperienceTokens(trip.destination);
  const [photo, setPhoto] = useState<DestinationPhoto | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPhoto(null);
    setPhotoFailed(false);
    getDestinationPhoto(trip.destination).then((resolved) => {
      if (!cancelled) setPhoto(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [trip.destination]);

  return (
    <div className="card card-interactive overflow-hidden rounded-card-lg flex flex-col">
      <div className="relative aspect-[16/9] shrink-0 overflow-hidden">
        {/* Procedural gradient — renders immediately, no loading flash. The
            permanent fallback if no photo ever resolves, not a placeholder. */}
        <div className="absolute inset-0" style={{ backgroundImage: tokens.gradients.hero }} />
        {/* Real photo, cross-faded on top once/if one resolves. width/height
            hint the browser to the intrinsic aspect ratio before the image
            loads, preventing layout shift; onError hides it again on a
            broken/failed load, leaving the gradient above as the visible
            result rather than a broken-image icon. */}
        {photo && !photoFailed && (
          <img
            src={photo.url}
            alt={photo.alt}
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            onError={() => setPhotoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover animate-fade-in"
          />
        )}
        {/* Bottom scrim strengthened to a fixed multi-stop black gradient
            (rather than Tailwind's from/via/to shorthand) so the location
            pill sits on consistently clean tonal ground regardless of the
            photo's own brightness or the active theme — the shorthand
            version read flatter in light mode simply because it's the same
            fixed black values either way, but needed more graduated depth
            to compete with brighter daylight photos. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.15) 55%, transparent 75%)' }}
        />
        {/* Matching top scrim so the status badge (which the bottom
            gradient doesn't reach) also has guaranteed contrast. */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%)' }}
        />
        <span className="chip absolute right-3 top-3 gap-1.5 bg-black/40 text-white backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDotColor[trip.status] ?? statusDotColor.Planning}`} />
          {trip.status}
        </span>
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 w-fit max-w-[calc(100%-1.5rem)]">
          <MapPin size={13} className="shrink-0 text-white" />
          <span className="text-sm font-medium text-white truncate">{formatLocationLabel(trip.destination)}</span>
        </div>
        {/* Photo-source attribution — Pexels' API terms require a visible
            credit/link; shown for Pixabay too for consistency. Never shown
            for curated/fallback images, which aren't sourced from either API. */}
        {photo && !photoFailed && (photo.source === 'pexels' || photo.source === 'pixabay') && (
          <a
            href={photo.photographerUrl ?? (photo.source === 'pexels' ? 'https://www.pexels.com' : 'https://pixabay.com')}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-1.5 right-2 text-[10px] text-white/60 hover:text-white/90 transition"
          >
            Photo{photo.photographer ? ` by ${photo.photographer}` : ''} via {photo.source === 'pexels' ? 'Pexels' : 'Pixabay'}
          </a>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg font-700 text-ink-900 truncate min-w-0">{trip.title}</h3>
          <button
            onClick={onEdit}
            className="rounded-full p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition shrink-0"
            aria-label={`Edit ${trip.title}`}
          >
            <Pencil size={14} />
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-ink-500" />
            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <Wallet size={13} className="text-ink-500" />
              <span className="font-medium">{trip.currency} {trip.budget.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-2">
              <Users size={13} className="text-ink-500" />
              {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </span>
          </div>
        </div>

        {trip.interests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {trip.interests.slice(0, 4).map((i) => (
              <span key={i} className="chip bg-glass/5 text-ink-600 text-[10px]">{i}</span>
            ))}
            {trip.interests.length > 4 && (
              <span className="chip bg-glass/5 text-ink-500 text-[10px]">+{trip.interests.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-glass/10 flex items-center gap-1 text-xs text-ink-500">
          <Clock size={11} />
          <span>Updated {formatLastUpdated(trip.lastUpdated)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={onOpen} className="btn-primary flex-1 text-sm">
            Open <ArrowRight size={14} />
          </button>
          <button
            onClick={() => {
              try {
                const ics = generateTripICS(trip);
                downloadICS(ics, `${trip.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
              } catch (e) {
                console.error('ICS export failed', e);
              }
            }}
            className="btn-outline px-3"
            aria-label={`Add ${trip.title} to calendar`}
          >
            <Calendar size={15} />
          </button>
          <button onClick={onDuplicate} className="btn-outline px-3" aria-label={`Duplicate ${trip.title}`}>
            <Copy size={15} />
          </button>
          <button
            onClick={onDelete}
            className="btn-outline px-3 text-rose-800 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
            aria-label={`Delete ${trip.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
