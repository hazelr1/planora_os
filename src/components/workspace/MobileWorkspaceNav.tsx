import {
  LayoutDashboard, CalendarRange, Plane, Building2, Wallet, Luggage,
  FileText, Image as ImageIcon, Settings as SettingsIcon,
} from 'lucide-react';
import type { WorkspaceSectionId } from './types';

interface MobileWorkspaceNavProps {
  active: WorkspaceSectionId;
  onSelect: (section: WorkspaceSectionId) => void;
}

const NAV_ITEMS: { id: WorkspaceSectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'days', label: 'Days', icon: CalendarRange },
  { id: 'flights', label: 'Flights', icon: Plane },
  { id: 'hotels', label: 'Hotels', icon: Building2 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'packing', label: 'Packing', icon: Luggage },
  { id: 'documents', label: 'Docs', icon: FileText },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

/** Bottom navigation for mobile — a horizontally scrollable icon strip covering the same sections as the desktop sidebar. */
export default function MobileWorkspaceNav({ active, onSelect }: MobileWorkspaceNavProps) {
  return (
    <nav
      className="flex overflow-x-auto gap-1 px-2 py-2 bg-ink-100/90 backdrop-blur-2xl border-t border-glass/10 shrink-0"
      aria-label="Workspace sections"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 shrink-0 transition ${
            active === id ? 'text-brand-300' : 'text-ink-500'
          }`}
        >
          <Icon size={18} />
          <span className="text-[10px] font-600">{label}</span>
        </button>
      ))}
    </nav>
  );
}
