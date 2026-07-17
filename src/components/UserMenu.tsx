import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Settings as SettingsIcon, Mail, LogOut } from 'lucide-react';
import type { Screen } from '../types';

interface UserMenuProps {
  name: string;
  onNavigate: (screen: Screen) => void;
  onSignOut: () => void;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

/**
 * Replaces the old always-expanded avatar + name + Sign out row — a single
 * avatar trigger that opens a menu with Settings, Contact us, and Sign out.
 * Same open/outside-click/Escape pattern as ThemeToggle's own dropdown, for
 * a consistent feel between the two header menus.
 */
export default function UserMenu({ name, onNavigate, onSignOut }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (screen: Screen) => {
    setOpen(false);
    onNavigate(screen);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-glass/5 transition"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
      >
        <div className="h-8 w-8 rounded-full bg-brand-500/20 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-700 shrink-0">
          {initialsOf(name)}
        </div>
        <ChevronDown size={15} className={`text-ink-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="card absolute right-0 top-full mt-2 w-48 p-1.5 z-50 animate-scale-in"
        >
          <p className="px-3 pt-1.5 pb-2 text-sm font-600 text-ink-800 truncate">{name}</p>
          <div className="h-px bg-glass/10 my-1" />
          <button
            role="menuitem"
            onClick={() => go({ name: 'settings' })}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-600 text-ink-600 hover:bg-glass/5 hover:text-ink-800 transition"
          >
            <SettingsIcon size={15} className="shrink-0" /> Settings
          </button>
          <button
            role="menuitem"
            onClick={() => go({ name: 'contact' })}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-600 text-ink-600 hover:bg-glass/5 hover:text-ink-800 transition"
          >
            <Mail size={15} className="shrink-0" /> Contact us
          </button>
          <div className="h-px bg-glass/10 my-1" />
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-600 text-ink-600 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-400 transition"
          >
            <LogOut size={15} className="shrink-0" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
