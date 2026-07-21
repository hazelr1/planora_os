import { ArrowRight, MapPin } from 'lucide-react';
import { formatDateRange } from '../utils/dates';

interface TemplateCardProps {
  title: string;
  destination: string;
  country: string;
  continent: string;
  summary: string;
  startDate: string;
  endDate: string;
  onClick: () => void;
}

/** A single suggested trip plan, shown both on the landing page (as a static
 * preview) and in BrowseTemplates (as a live, clickable list item) — same
 * card, two data sources. */
export default function TemplateCard({ title, destination, country, continent, summary, startDate, endDate, onClick }: TemplateCardProps) {
  return (
    <button onClick={onClick} className="card card-interactive p-5 text-left w-full">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">{country} — {continent}</p>
      <h3 className="font-display text-lg font-700 text-ink-900 mt-1">{title}</h3>
      <p className="text-sm text-ink-600 mt-1.5 flex items-center gap-1.5">
        <MapPin size={13} className="shrink-0" /> {destination}
      </p>
      <p className="text-sm text-ink-600 mt-2 leading-relaxed">{summary}</p>
      <div className="mt-4 flex items-center justify-between text-xs text-ink-500">
        <span>{formatDateRange(startDate, endDate)}</span>
        <span className="flex items-center gap-1 font-600 text-brand-700 dark:text-brand-300">
          View plan <ArrowRight size={12} />
        </span>
      </div>
    </button>
  );
}
