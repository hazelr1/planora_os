import type { CSSProperties, ReactNode } from 'react';
import { detectDestinationTheme, getDestinationTheme, type DestinationTheme } from './destinationThemes';

function resolveDestinationTheme(destination: string): DestinationTheme | null {
  return getDestinationTheme(detectDestinationTheme(destination));
}

interface DestinationThemeScopeProps {
  destination: string;
  children: ReactNode;
}

/**
 * Scopes destination-themed accent colors to everything inside it, by
 * overriding a handful of CSS custom properties (--brand-300..600,
 * --accent-from/via/to) on this wrapper. Because CSS variables only
 * cascade downward, this can never leak out and affect the rest of the
 * site — Landing/SignIn/MyTrips/CreateTrip stay on the plain light/dark
 * theme regardless of what's set here. Falls through to a plain
 * passthrough div when the destination doesn't match a known theme (still
 * `h-full` so it doesn't disturb WorkspaceShell's flex layout).
 */
export default function DestinationThemeScope({ destination, children }: DestinationThemeScopeProps) {
  const theme = resolveDestinationTheme(destination);

  const style: CSSProperties | undefined = theme
    ? ({
        '--brand-300': theme.brand[300],
        '--brand-400': theme.brand[400],
        '--brand-500': theme.brand[500],
        '--brand-600': theme.brand[600],
        '--accent-from': theme.accent.from,
        '--accent-via': theme.accent.via,
        '--accent-to': theme.accent.to,
      } as CSSProperties)
    : undefined;

  return (
    <div className="h-full" style={style} data-destination-theme={theme?.id ?? 'default'}>
      {children}
    </div>
  );
}
