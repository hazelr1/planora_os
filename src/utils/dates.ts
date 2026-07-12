export function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const sFmt = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const eFmt = e.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' });
  return `${sFmt} – ${eFmt}, ${e.getFullYear()}`;
}

export function formatDate(date: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(date + 'T00:00:00').toLocaleDateString(
    'en-US',
    opts ?? { weekday: 'long', month: 'long', day: 'numeric' },
  );
}

export function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
