import type { DestinationTheme } from './destinationThemes';
import DestinationMotif from './DestinationMotif';

/** A quiet ornamental rule used between major blocks within a themed trip page. */
export default function DestinationDivider({ theme }: { theme: DestinationTheme }) {
  return (
    <div className="flex items-center gap-3 my-5 text-brand-400" aria-hidden="true">
      <div className="h-px flex-1 bg-current opacity-20" />
      <DestinationMotif theme={theme.id} className="h-5 w-10 opacity-60" />
      <div className="h-px flex-1 bg-current opacity-20" />
    </div>
  );
}
