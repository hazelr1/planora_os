const ACRONYMS = new Set(['uae', 'usa', 'uk', 'us', 'dc']);

/**
 * Title-cases free-text location strings for display (e.g. "dubai, uae" ->
 * "Dubai, UAE"). Display-only — never write the result back to storage,
 * since callers elsewhere (geocoding/photo lookups, destination theming)
 * key off the raw casing as typed.
 */
export function formatLocationLabel(raw: string): string {
  return raw
    .split(/\s+/)
    .map((word) => {
      const letters = word.replace(/[^a-zA-Z]/g, '');
      if (ACRONYMS.has(letters.toLowerCase())) {
        return word.replace(/[a-zA-Z]+/, (m) => m.toUpperCase());
      }
      return word.length ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word;
    })
    .join(' ');
}
