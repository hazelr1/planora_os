/**
 * geography.ts
 *
 * Static continent -> country reference list backing the suggested-trip-plans
 * browse picker (BrowseTemplates.tsx). Nothing like this existed anywhere in
 * the codebase before — destinations elsewhere (DESTINATION_REGISTRY, the
 * trip-creation form) are free text or a flat list of 15 curated profiles,
 * neither of which is a continent/country hierarchy. Countries listed here
 * don't need pre-existing trip_templates rows; a country with none yet
 * simply shows an empty state until it's been generated (see
 * templateRepository.listTemplatesForCountry).
 */

export interface ContinentEntry {
  name: string;
  countries: string[];
}

export const CONTINENTS: ContinentEntry[] = [
  {
    name: 'Asia',
    countries: ['Japan', 'Thailand', 'Vietnam', 'Indonesia', 'India', 'South Korea', 'China', 'United Arab Emirates'],
  },
  {
    name: 'Europe',
    countries: ['Greece', 'Italy', 'France', 'Spain', 'Portugal', 'United Kingdom', 'Iceland', 'Switzerland'],
  },
  {
    name: 'Africa',
    countries: ['Morocco', 'Egypt', 'South Africa', 'Kenya', 'Tanzania'],
  },
  {
    name: 'North America',
    countries: ['United States', 'Canada', 'Mexico', 'Costa Rica'],
  },
  {
    name: 'South America',
    countries: ['Peru', 'Brazil', 'Argentina', 'Chile', 'Colombia'],
  },
  {
    name: 'Oceania',
    countries: ['Australia', 'New Zealand', 'Fiji'],
  },
];
