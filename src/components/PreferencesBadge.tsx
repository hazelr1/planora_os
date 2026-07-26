import { Sparkles } from 'lucide-react';
import type { TripPreferenceTags } from '../data';
import { summarizePreferenceTags } from '../lib/tripPreferences';

interface PreferencesBadgeProps {
  tags: TripPreferenceTags;
}

/**
 * Mirrors DemoModeBadge's shape (small pill, icon + label, a tooltip for the
 * specifics) for the same reason: a quiet, always-visible reminder rather
 * than a one-time toast that could be missed. Shown only when there's
 * something real to report — see the `tags` check at each call site — so a
 * first-time user with no trip history yet never sees an empty claim.
 */
export default function PreferencesBadge({ tags }: PreferencesBadgeProps) {
  const summary = summarizePreferenceTags(tags);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wide text-violet-700 dark:text-violet-300"
      title={summary ? `Using your saved preferences: ${summary}` : 'Using your saved preferences'}
    >
      <Sparkles size={12} className="shrink-0" />
      <span>Using your preferences</span>
    </span>
  );
}
