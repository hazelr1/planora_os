import { useState } from 'react';
import {
  User as UserIcon, Palette, Trash2, Check, Loader2, Sun, Moon, Monitor,
} from 'lucide-react';
import type { User as AppUser } from '../types';
import { authRepository } from '../data';
import { useTheme, type ThemeMode } from '../hooks/useTheme';
import ConfirmDialog from '../components/ConfirmDialog';

interface SettingsProps {
  user: AppUser;
  /** Signs the user out and navigates to landing — also used after a
   * successful account deletion, since the session is no longer valid. */
  onSignOut: () => Promise<void>;
}

type Tab = 'account' | 'theme';

const TABS: { id: Tab; label: string; icon: typeof UserIcon }[] = [
  { id: 'account', label: 'Account info', icon: UserIcon },
  { id: 'theme', label: 'Theme & Display', icon: Palette },
];

export default function Settings({ user, onSignOut }: SettingsProps) {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-800 text-ink-900">Settings</h1>
        <p className="text-ink-600 mt-1 text-sm">Manage your account and app preferences.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <nav className="flex sm:flex-col gap-1.5 sm:w-52 shrink-0 overflow-x-auto pb-1 sm:pb-0" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-600 shrink-0 transition ${
                tab === id ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'text-ink-600 hover:bg-glass/5 hover:text-ink-800'
              }`}
            >
              <Icon size={16} className="shrink-0" /> {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {tab === 'account'
            ? <AccountTab user={user} onSignOut={onSignOut} />
            : <ThemeTab />}
        </div>
      </div>
    </div>
  );
}

// ─── Account info ───────────────────────────────────────────────────────────

function AccountTab({ user, onSignOut }: SettingsProps) {
  const [name, setName] = useState(user.name);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nameChanged = name.trim() !== user.name && name.trim().length > 0;

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === user.name) return;
    setSaveStatus('saving');
    setSaveError(null);
    const result = await authRepository.updateName(trimmed);
    if (!result.ok) {
      setSaveError(result.error.message);
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await authRepository.deleteAccount();
    if (!result.ok) {
      setDeleteError(result.error.message);
      setDeleting(false);
      return;
    }
    await onSignOut();
  };

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="card p-6">
        <h2 className="font-display text-base font-700 text-ink-900 mb-4">Profile</h2>

        <div className="space-y-4 max-w-sm">
          <div>
            <label htmlFor="settings-name" className="label">Display name</label>
            <input
              id="settings-name"
              className="input"
              value={name}
              onChange={(e) => { setName(e.target.value); setSaveStatus('idle'); }}
              placeholder="Your name"
              maxLength={80}
            />
          </div>

          <div>
            <label htmlFor="settings-email" className="label">Email</label>
            <input id="settings-email" className="input opacity-60" value={user.email} disabled readOnly />
            <p className="mt-1.5 text-xs text-ink-500">Email can't be changed here.</p>
          </div>

          {saveStatus === 'error' && saveError && (
            <p className="text-xs text-rose-800 dark:text-rose-400">{saveError}</p>
          )}

          <button
            onClick={handleSaveName}
            disabled={!nameChanged || saveStatus === 'saving'}
            className="btn-primary text-sm"
          >
            {saveStatus === 'saving'
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : saveStatus === 'saved'
              ? <><Check size={14} /> Saved</>
              : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6 border-rose-500/20">
        <h2 className="font-display text-base font-700 text-ink-900 mb-1">Delete account</h2>
        <p className="text-sm text-ink-600 leading-relaxed max-w-lg">
          Permanently deletes your account and every trip, day, and activity you've created. This cannot be undone.
        </p>
        <button
          onClick={() => { setConfirmDelete(true); setDeleteError(null); }}
          className="btn-danger text-sm mt-4"
        >
          <Trash2 size={14} /> Delete my account
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete your account?"
        message={deleteError ?? "This permanently deletes your account and all of your trips. This action can't be undone."}
        confirmLabel={deleting ? 'Deleting…' : 'Delete account'}
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => { if (!deleting) setConfirmDelete(false); }}
      />
    </div>
  );
}

// ─── Theme & Display ─────────────────────────────────────────────────────────

const THEME_OPTIONS: { mode: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
  { mode: 'light', label: 'Light', description: 'Warm, editorial light theme.', icon: Sun },
  { mode: 'dark', label: 'Dark', description: 'Deep navy with a turquoise glow.', icon: Moon },
  { mode: 'system', label: 'System', description: "Match your device's setting.", icon: Monitor },
];

function ThemeTab() {
  const { mode, resolvedTheme, setMode } = useTheme();

  return (
    <div className="card p-6">
      <h2 className="font-display text-base font-700 text-ink-900 mb-1">Appearance</h2>
      <p className="text-sm text-ink-600 mb-5">
        Choose how Planora looks on this device{mode === 'system' ? ` — currently ${resolvedTheme}` : ''}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {THEME_OPTIONS.map(({ mode: optMode, label, description, icon: Icon }) => {
          const active = mode === optMode;
          return (
            <button
              key={optMode}
              onClick={() => setMode(optMode)}
              className={`relative text-left rounded-xl border p-4 transition ${
                active
                  ? 'border-brand-500/50 bg-brand-500/10'
                  : 'border-glass/10 bg-ink-200/30 hover:bg-ink-200/60'
              }`}
              aria-pressed={active}
            >
              {active && (
                <span className="absolute right-3 top-3 h-5 w-5 rounded-full bg-brand-500 text-white dark:text-black flex items-center justify-center">
                  <Check size={12} />
                </span>
              )}
              <Icon size={20} className={active ? 'text-brand-700 dark:text-brand-300' : 'text-ink-500'} />
              <p className="mt-3 text-sm font-700 text-ink-900">{label}</p>
              <p className="mt-0.5 text-xs text-ink-600 leading-relaxed">{description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
