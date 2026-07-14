/**
 * Best-effort currency guess from a free-text destination string, so the
 * trip form's currency field can track what the user is typing instead of
 * defaulting to USD for everywhere. Deliberately keyword-based rather than a
 * model/geocoding call — same reasoning as destinations/inference.ts: this
 * has to run synchronously on every keystroke with no network dependency.
 *
 * First match wins, so more specific hints (a named city) are listed ahead
 * of broader ones only where a country could otherwise be ambiguous — in
 * practice every hint here maps to exactly one currency, so order mostly
 * only matters for the very rare destination string that could match more
 * than one country name.
 */

interface CurrencyHint {
  pattern: RegExp;
  currency: string;
}

const CURRENCY_HINTS: CurrencyHint[] = [
  // North America
  { pattern: /united states|\busa\b|\bu\.s\.a?\.?\b|new york|los angeles|san francisco|chicago|miami|las vegas|hawaii|seattle|boston/i, currency: 'USD' },
  { pattern: /canada|toronto|vancouver|montreal|ottawa|calgary|quebec/i, currency: 'CAD' },
  { pattern: /mexico|cancun|tulum|oaxaca/i, currency: 'MXN' },

  // Europe — eurozone
  { pattern: /france|paris|nice|lyon|marseille|provence/i, currency: 'EUR' },
  { pattern: /germany|berlin|munich|frankfurt|hamburg/i, currency: 'EUR' },
  { pattern: /\bitaly\b|\brome\b|venice|milan|florence|tuscany|sicily|amalfi/i, currency: 'EUR' },
  { pattern: /\bspain\b|madrid|barcelona|seville|ibiza|valencia|mallorca/i, currency: 'EUR' },
  { pattern: /portugal|lisbon|porto|algarve/i, currency: 'EUR' },
  { pattern: /greece|athens|santorini|mykonos|crete/i, currency: 'EUR' },
  { pattern: /netherlands|amsterdam/i, currency: 'EUR' },
  { pattern: /austria|vienna/i, currency: 'EUR' },
  { pattern: /belgium|brussels/i, currency: 'EUR' },
  { pattern: /ireland|dublin/i, currency: 'EUR' },
  { pattern: /finland|helsinki/i, currency: 'EUR' },
  { pattern: /croatia|dubrovnik|split/i, currency: 'EUR' },
  { pattern: /\bmalta\b/i, currency: 'EUR' },
  { pattern: /\bcyprus\b/i, currency: 'EUR' },

  // Europe — other
  { pattern: /united kingdom|england|scotland|wales|london|edinburgh|manchester|\buk\b|britain/i, currency: 'GBP' },
  { pattern: /switzerland|zurich|geneva|zermatt/i, currency: 'CHF' },
  { pattern: /iceland|reykjavik/i, currency: 'ISK' },
  { pattern: /norway|\boslo\b|bergen/i, currency: 'NOK' },
  { pattern: /sweden|stockholm/i, currency: 'SEK' },
  { pattern: /denmark|copenhagen/i, currency: 'DKK' },
  { pattern: /turkey|istanbul|cappadocia/i, currency: 'TRY' },

  // Asia
  { pattern: /japan|tokyo|kyoto|osaka|okinawa/i, currency: 'JPY' },
  { pattern: /\bchina\b|beijing|shanghai|guangzhou|shenzhen/i, currency: 'CNY' },
  { pattern: /hong kong/i, currency: 'HKD' },
  { pattern: /south korea|seoul|busan|\bkorea\b/i, currency: 'KRW' },
  { pattern: /\bindia\b|delhi|mumbai|\bgoa\b|jaipur|bangalore|kerala/i, currency: 'INR' },
  { pattern: /indonesia|\bbali\b|jakarta|ubud|lombok/i, currency: 'IDR' },
  { pattern: /thailand|bangkok|phuket|chiang mai/i, currency: 'THB' },
  { pattern: /vietnam|hanoi|ho chi minh|halong/i, currency: 'VND' },
  { pattern: /philippines|manila|\bcebu\b|palawan/i, currency: 'PHP' },
  { pattern: /malaysia|kuala lumpur|penang/i, currency: 'MYR' },
  { pattern: /singapore/i, currency: 'SGD' },
  { pattern: /united arab emirates|\bdubai\b|abu dhabi|\buae\b/i, currency: 'AED' },

  // Oceania
  { pattern: /australia|sydney|melbourne|brisbane|\bperth\b/i, currency: 'AUD' },
  { pattern: /new zealand|auckland|wellington|queenstown/i, currency: 'NZD' },

  // Africa
  { pattern: /morocco|marrakech|casablanca|\bfez\b|chefchaouen/i, currency: 'MAD' },
  { pattern: /egypt|cairo|luxor|\bgiza\b/i, currency: 'EGP' },
  { pattern: /south africa|cape town|johannesburg/i, currency: 'ZAR' },
  { pattern: /kenya|nairobi|maasai mara/i, currency: 'KES' },
  { pattern: /tanzania|zanzibar|serengeti/i, currency: 'TZS' },

  // South America
  { pattern: /brazil|rio de janeiro|sao paulo|salvador/i, currency: 'BRL' },
  { pattern: /argentina|buenos aires|patagonia/i, currency: 'ARS' },
  { pattern: /\bperu\b|\blima\b|cusco|machu picchu/i, currency: 'PEN' },
  { pattern: /\bchile\b|santiago/i, currency: 'CLP' },
  { pattern: /colombia|bogota|cartagena|medellin/i, currency: 'COP' },
];

/** Returns a currency code guessed from free-text destination, or null if nothing matched. */
export function detectCurrencyFromDestination(destination: string): string | null {
  const text = destination.trim();
  if (!text) return null;
  for (const hint of CURRENCY_HINTS) {
    if (hint.pattern.test(text)) return hint.currency;
  }
  return null;
}
