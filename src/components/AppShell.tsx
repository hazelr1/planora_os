import { Compass, ArrowLeft, LogOut } from 'lucide-react';
import type { Screen, User as AppUser } from '../types';

interface AppShellProps {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
  children: React.ReactNode;
  hideChrome?: boolean;
  user?: AppUser | null;
  onSignOut?: () => void;
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
  return (
    <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-700 shrink-0">
      {initials}
    </div>
  );
}

export default function AppShell({
  screen, onNavigate, children, hideChrome = false, user, onSignOut,
}: AppShellProps) {
  if (hideChrome) {
    return <div className="min-h-screen bg-ink-50">{children}</div>;
  }

  const isWorkspace = screen.name === 'workspace';
  const displayName = user?.name || user?.email || '';

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => onNavigate({ name: 'landing' })}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-soft">
              <Compass className="text-white" size={18} strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-800 text-ink-900 group-hover:text-brand-700 transition-colors">
              Planora
            </span>
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {isWorkspace ? (
              <button onClick={() => onNavigate({ name: 'trips' })} className="btn-ghost">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">My Trips</span>
              </button>
            ) : (
              <>
                {user ? (
                  // ── Signed-in state ──
                  <>
                    <button
                      onClick={() => onNavigate({ name: 'trips' })}
                      className="btn-ghost"
                    >
                      My Trips
                    </button>

                    {/* User chip */}
                    <div className="flex items-center gap-2 pl-1">
                      <UserAvatar name={displayName} />
                      <span className="hidden sm:block text-sm font-medium text-ink-700 max-w-[140px] truncate">
                        {displayName}
                      </span>
                      <button
                        onClick={onSignOut}
                        className="btn-ghost text-ink-500 hover:text-rose-600 gap-1.5"
                        title="Sign out"
                      >
                        <LogOut size={15} />
                        <span className="hidden sm:inline text-sm">Sign out</span>
                      </button>
                    </div>
                  </>
                ) : (
                  // ── Signed-out state ──
                  <>
                    <button
                      onClick={() => onNavigate({ name: 'trips' })}
                      className="btn-ghost"
                    >
                      My Trips
                    </button>
                    <button
                      onClick={() => onNavigate({ name: 'signin' })}
                      className="btn-outline"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
