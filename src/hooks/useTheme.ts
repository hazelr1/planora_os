import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** The user's chosen preference — may be 'system'. */
  mode: ThemeMode;
  /** What's actually applied right now ('system' resolved to light/dark). */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light -> dark -> system -> light. */
  cycleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
