import type { ReactNode } from 'react';
import { projectExperienceTokensToCss, useExperienceTokens } from '../../destinations';

interface DestinationThemeScopeProps {
  destination: string;
  children: ReactNode;
}

/**
 * Scopes destination experience tokens to everything inside it, by
 * overriding CSS custom properties (--brand-300..600, --accent-from/via/to,
 * plus the --dest-* surface) on this wrapper. Because CSS variables only
 * cascade downward, this can never leak out and affect the rest of the site
 * — Landing/SignIn/MyTrips/CreateTrip stay on the plain light/dark theme
 * regardless of what's set here.
 *
 * Reads tokens only — never `DestinationProfile` — via `useExperienceTokens`,
 * which already applies the theming policy (see policy.ts) and falls back
 * to the app's default tokens on its own, so this component never has to
 * branch on "is there a theme or not."
 */
export default function DestinationThemeScope({ destination, children }: DestinationThemeScopeProps) {
  const { tokens, origin } = useExperienceTokens(destination);

  return (
    <div className="h-full" style={projectExperienceTokensToCss(tokens)} data-destination-theme={origin}>
      {children}
    </div>
  );
}
