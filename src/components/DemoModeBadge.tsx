import { Clock } from 'lucide-react';
import { formatRelativeExpiry } from '../utils/dates';

interface DemoModeBadgeProps {
  expiresAt: string | null;
}

/**
 * Persistent, always-visible reminder that the current session is a
 * temporary demo account — sits in the sticky header so it's on screen no
 * matter what page a demo user is looking at, rather than a one-time toast
 * that could be missed or forgotten. The exact expiry timestamp is in the
 * title tooltip; the label itself stays a coarse "in Xh"/"in Xd" so it never
 * reads as a live-ticking countdown that needs a timer to stay accurate.
 */
export default function DemoModeBadge({ expiresAt }: DemoModeBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-700 uppercase tracking-wide text-amber-700 dark:text-amber-300"
      title={expiresAt ? `Demo data is deleted at ${new Date(expiresAt).toLocaleString()}` : 'Demo data is temporary'}
    >
      <Clock size={12} className="shrink-0" />
      <span>Demo Mode</span>
      {expiresAt && <span className="hidden sm:inline text-amber-700/70 dark:text-amber-300/70">· expires {formatRelativeExpiry(expiresAt)}</span>}
    </span>
  );
}
