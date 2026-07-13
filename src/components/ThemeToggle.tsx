import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const LABELS = { light: 'Light', dark: 'Dark', system: 'System' } as const;

/** Cycles Light -> Dark -> System -> Light. Shows what's active, not what clicking does — matches the icon to the currently-applied theme. */
export default function ThemeToggle() {
  const { mode, resolvedTheme, cycleMode } = useTheme();
  const Icon = ICONS[mode];

  return (
    <button
      onClick={cycleMode}
      className="btn-ghost gap-1.5"
      aria-label={`Theme: ${LABELS[mode]}${mode === 'system' ? ` (${resolvedTheme})` : ''}. Click to change.`}
      title={`Theme: ${LABELS[mode]}${mode === 'system' ? ` (currently ${resolvedTheme})` : ''}`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline text-sm">{LABELS[mode]}</span>
    </button>
  );
}
