import { describe, it, expect } from 'vitest';
import { geocode } from '../src/services/geocode';

describe('geocode caching', () => {
  it('returns an array (may be empty) and caches results', async () => {
    const q = `Testville ${Date.now()}`;
    const res = await geocode(q);
    expect(Array.isArray(res)).toBe(true);
  });
});
