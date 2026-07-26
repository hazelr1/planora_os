import { Compass, ArrowLeft, Map } from 'lucide-react';
import type { Screen, User as AppUser } from '../types';
import UserMenu from './UserMenu';
import DemoModeBadge from './DemoModeBadge';

interface AppShellProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
  hideChrome?: boolean;
  /** Fills the viewport edge-to-edge below the header, with its own internal
   * scroll regions, instead of the centered max-width/padded page container.
   * Used by the Workspace screen's Notion/Linear-style 3-column layout. */
  fullBleed?: boolean;
  user?: AppUser | null;
  onSignOut?: () => void;
}

export default function AppShell({
  screen, onNavigate, children, hideChrome = false, fullBleed = false, user, onSignOut,
}: AppShellProps) {
  if (hideChrome) {
    return <div className="min-h-screen bg-ink-50">{children}</div>;
  }

  const isWorkspace = screen.name === 'workspace';
  const isLanding = screen.name === 'landing';
  const displayName = user?.name || user?.email || '';

  // Landing gets its own subtly deepening gradient ground in light mode
  // (dark mode keeps the standard flat ink-50 base) — every other screen
  // keeps the flat bg-ink-50 used app-wide. Both stops are ink-scale
  // tokens (ink-50 → ink-200), not one-off hex, so this tracks the shared
  // light-mode palette instead of drifting from it on its own.
  const bgClass = isLanding
    ? 'bg-gradient-to-b from-ink-50 to-ink-200 dark:bg-none dark:bg-ink-50'
    : 'bg-ink-50';

  return (
    <div className={`${fullBleed ? 'h-screen flex flex-col overflow-hidden' : 'min-h-screen'} ${bgClass}`}>
      <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-glass/10 shrink-0 bg-ink-50/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => onNavigate({ name: 'landing' })}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-soft">
              <Compass className="text-white dark:text-black" size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-800 text-ink-900 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
              Planora
            </span>
          </button>

          {/* Nav — "My Trips" and "Suggested Trip Plans" plus, when signed
              in, a single avatar menu (Settings/Contact us/Sign out)
              instead of a separate theme toggle + name + Sign out row.
              Theme now lives in Settings. The demo badge lives here (not as
              a separate justify-between slot) so it shares the same
              gap/wrap-safe flex row as the rest of the nav on narrow
              screens, always on screen for a demo session — not buried in
              a menu that might never get opened. */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {user?.isDemo && <DemoModeBadge expiresAt={user.demoExpiresAt} />}

            {isWorkspace ? (
              <button onClick={() => onNavigate({ name: 'trips' })} className="btn-ghost">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">My Trips</span>
              </button>
            ) : (
              <button onClick={() => onNavigate({ name: 'trips' })} className="btn-ghost">
                <Map size={16} />
                <span className="hidden sm:inline">My Trips</span>
              </button>
            )}

            <button onClick={() => onNavigate({ name: 'browse-templates' })} className="btn-ghost">
              <Compass size={16} />
              <span className="hidden sm:inline">Suggested Trip Plans</span>
            </button>

            {user ? (
              <UserMenu name={displayName} isDemo={user.isDemo} onNavigate={onNavigate} onSignOut={() => onSignOut?.()} />
            ) : (
              <button onClick={() => onNavigate({ name: 'signin' })} className="btn-outline">
                Sign in
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className={fullBleed ? 'flex-1 min-h-0 overflow-hidden' : 'max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8'}>
        {children}
      </main>
    </div>
  );
}
