import type { Trip } from '../types';

function escapeICS(text: string) {
  return text.replace(/[\\,;\n]/g, (m) => (m === '\n' ? '\\n' : `\\${m}`));
}

export function generateTripICS(trip: Trip) {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Planora//EN');

  for (const day of trip.days) {
    for (const activity of day.activities) {
      const start = activity.time ? activity.time : '';
      // Use date-only events when time isn't provided
      const dtstart = `${activity.date.replace(/-/g, '')}T000000`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${trip.id}-${activity.id}`);
      lines.push(`SUMMARY:${escapeICS(activity.title)}`);
      lines.push(`DESCRIPTION:${escapeICS(activity.description ?? '')}`);
      lines.push(`DTSTART:${dtstart}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(text: string, filename = 'planora-trip.ics') {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
