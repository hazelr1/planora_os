/**
 * Deterministic "pick of the day" — the same pool + salt always resolves to
 * the same index for the whole calendar day (so a photo doesn't change
 * mid-visit or between one component's renders and another's), then rolls
 * to a different one the next day. Cycles back through the pool (repeats)
 * once every entry has had its turn, rather than needing a fresh image for
 * every single day forever.
 */

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** YYYY-MM-DD in the viewer's local time zone — changes once a day, at local midnight. */
export function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * Index into a pool of the given length for "today", salted so different
 * slots (hero, a specific destination, etc.) don't all land on the same
 * offset within their own pools on the same day.
 */
export function dailyIndex(poolLength: number, salt: string): number {
  if (poolLength <= 0) return 0;
  return hashString(`${todayKey()}::${salt}`) % poolLength;
}

/** Picks today's item from a pool — deterministic per day+salt, wraps/repeats once the pool is exhausted. */
export function pickDaily<T>(pool: readonly T[], salt: string): T {
  return pool[dailyIndex(pool.length, salt)];
}
