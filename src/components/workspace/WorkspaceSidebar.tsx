import {
  LayoutDashboard, CalendarRange, Plane, Building2, Wallet, Luggage,
  FileText, Image as ImageIcon, Settings as SettingsIcon,
} from 'lucide-react';
import type { WorkspaceSectionId } from './types';

interface WorkspaceSidebarProps {
  active: WorkspaceSectionId;
  onSelect: (section: WorkspaceSectionId) => void;
  tripTitle: string;
  destination: string;
}

const NAV_ITEMS: { id: WorkspaceSectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Trip Overview', icon: LayoutDashboard },
  { id: 'days', label: 'Days', icon: CalendarRange },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Building2 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'packing', label: 'Packing', icon: Luggage },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function WorkspaceSidebar({ active, onSelect, tripTitle, destination }: WorkspaceSidebarProps) {
  return (
    <nav className="flex flex-col h-full py-4 px-2 lg:px-3 overflow-y-auto" aria-label="Workspace sections">
      <div className="px-2 mb-4 hidden lg:block">
        <p className="font-display text-sm font-700 text-ink-900 truncate">{tripTitle}</p>
        <p className="text-xs text-ink-600 truncate">{destination}</p>
      </div>
      <div className="space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={label}
            className={`w-full flex items-center justify-center lg:justify-start gap-2.5 rounded-xl px-2.5 lg:px-3 py-2 text-sm font-600 transition ${
              active === id
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300'
                : 'text-ink-600 hover:bg-glass/5 hover:text-ink-800'
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="truncate hidden lg:inline">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
