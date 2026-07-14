import { useEffect, useRef, useState } from 'react';
import { Moon, Sun, Monitor, Check, Palette } from 'lucide-react';
import { useTheme, type ThemeMode } from '../hooks/useTheme';

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const LABELS: Record<ThemeMode, string> = { light: 'Light', dark: 'Dark', system: 'System' };
const OPTIONS: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * The trigger always reads "Theme" — showing the active mode's own name
 * here (as the old cycle-button did) read as a live status ("System"?
 * "Dark"?) rather than a control, which was confusing on first glance.
 * Clicking opens a menu of all three modes instead of cycling blindly
 * through them one click at a time.
 */
export default function ThemeToggle() {
  const { mode, resolvedTheme, setMode } = useTheme();
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

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-ghost gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Theme: ${LABELS[mode]}${mode === 'system' ? ` (${resolvedTheme})` : ''}. Click to change.`}
        title={`Theme: ${LABELS[mode]}${mode === 'system' ? ` (currently ${resolvedTheme})` : ''}`}
      >
        <Palette size={16} />
        <span className="hidden sm:inline text-sm">Theme</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose theme"
          className="card absolute right-0 top-full mt-2 w-40 p-1.5 z-50 animate-scale-in"
        >
          {OPTIONS.map((opt) => {
            const OptIcon = ICONS[opt];
            const active = mode === opt;
            return (
              <button
                key={opt}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setMode(opt); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-600 transition ${
                  active ? 'bg-brand-500/15 text-brand-300' : 'text-ink-600 hover:bg-glass/5 hover:text-ink-800'
                }`}
              >
                <OptIcon size={15} className="shrink-0" />
                <span className="flex-1 text-left">
                  {LABELS[opt]}
                  {opt === 'system' && <span className="text-ink-500 font-normal"> ({resolvedTheme})</span>}
                </span>
                {active && <Check size={14} className="shrink-0 text-brand-300" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
