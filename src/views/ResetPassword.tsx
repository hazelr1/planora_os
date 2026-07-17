import { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authRepository } from '../data';

interface ResetPasswordProps {
  onDone: () => void;
}

function validate(password: string, confirmPassword: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

export default function ResetPassword({ onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const err = validate(password, confirmPassword);
    if (err) { setError(err); return; }

    setLoading(true);
    try {
      const result = await authRepository.updatePassword(password);
      if (!result.ok) { setError(result.error.message); return; }
      setSuccess(true);
      setTimeout(onDone, 1800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-800 text-ink-900">Set a new password</h1>
          <p className="text-sm text-ink-600 mt-2">Choose a new password for your account.</p>
        </div>

        <div className="card p-8">
          {success ? (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-4 flex items-start gap-3 animate-scale-in" role="status">
              <CheckCircle2 size={18} className="text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Password updated.</p>
                <p className="text-sm text-emerald-800 dark:text-emerald-300/80 mt-1">Taking you to your trips…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="rounded-xl bg-rose-500/10 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
                  <AlertCircle size={15} className="text-rose-800 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-800 dark:text-rose-300">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="new-password" className="label">New password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
                    <Lock size={15} />
                  </span>
                  <input
                    id="new-password" type="password" className="input pl-9"
                    placeholder="At least 6 characters" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password" disabled={loading} autoFocus
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-new-password" className="label">Confirm new password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
                    <Lock size={15} />
                  </span>
                  <input
                    id="confirm-new-password" type="password"
                    className={`input pl-9 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-500/40 focus:ring-rose-500/30'
                        : ''
                    }`}
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password" disabled={loading}
                  />
                  {confirmPassword && confirmPassword === password && (
                    <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800 dark:text-emerald-400" />
                  )}
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-rose-800 dark:text-rose-400">Passwords do not match.</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-glass/30 border-t-white animate-spin" />
                    Saving…
                  </span>
                ) : (
                  <><span>Set new password</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
