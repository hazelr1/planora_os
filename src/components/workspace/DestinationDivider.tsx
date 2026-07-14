import type { ExperienceTokens } from '../../destinations';
import DestinationMotif from './DestinationMotif';

/** A quiet ornamental rule used between major blocks within a themed trip page. Reads tokens only. */
export default function DestinationDivider({ tokens }: { tokens: ExperienceTokens }) {
  return (
    <div className="flex items-center gap-3 my-5 text-brand-400" aria-hidden="true">
      <div className="h-px flex-1 bg-current opacity-20" />
      <DestinationMotif strokes={tokens.iconTreatment.motif} className="h-5 w-10 opacity-60" />
      <div className="h-px flex-1 bg-current opacity-20" />
    </div>
  );
}
