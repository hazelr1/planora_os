import { describe, it, expect } from 'vitest';
import { generateTripICS } from '../src/utils/ics';

const trip = {
  id: 't1',
  title: 'Test Trip',
  destination: 'Testville',
  startDate: '2026-01-01',
  endDate: '2026-01-02',
  budget: 100,
  currency: 'USD',
  travelers: 1,
  pace: 'Balanced',
  interests: [],
  specialRequests: '',
  status: 'Planning',
  lastUpdated: new Date().toISOString(),
  isDemo: true,
  days: [
    { id: 'd1', tripId: 't1', label: 'Day 1', date: '2026-01-01', theme: '', summary: '', activities: [ { id: 'a1', dayId: 'd1', tripId: 't1', title: 'Thing', description: 'Do this', time: '09:00', location: 'Place', duration: 60, cost: 0, currency: 'USD', category: 'Culture', aiReason: '', locked: false, notes: [], latitude: null, longitude: null, costConfidence: 'low', updatedAt: new Date().toISOString() } ] },
  ],
};

describe('ICS generator', () => {
  it('produces a calendar string containing events', () => {
    const ics = generateTripICS(trip as any);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Thing');
  });
});
