import type { DestinationTheme } from './destinationThemes';
import DestinationMotif from './DestinationMotif';

interface DestinationHeroBannerProps {
  theme: DestinationTheme;
  destination: string;
}

/**
 * Decorative banner shown only when a destination theme is recognized —
 * a standalone, self-contained visual element (its own gradient + text
 * scrim) so it never affects the readability of the trip header above/below
 * it, regardless of the site's light/dark mode.
 */
export default function DestinationHeroBanner({ theme, destination }: DestinationHeroBannerProps) {
  return (
    <div
      className="relative h-20 sm:h-24 rounded-2xl overflow-hidden shadow-card mb-5 animate-fade-in"
      style={{ backgroundImage: theme.heroGradient }}
    >
      <DestinationMotif
        theme={theme.id}
        className="absolute right-0 bottom-0 h-full w-2/3 sm:w-1/2 text-white/25"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      <div className="absolute inset-0 flex items-end p-4 sm:p-5">
        <p className="font-display text-base sm:text-lg font-700 text-white drop-shadow-sm">
          {theme.name} atmosphere
        </p>
        <p className="hidden sm:block text-xs text-white/70 ml-2 mb-0.5">— {destination}</p>
      </div>
    </div>
  );
}
