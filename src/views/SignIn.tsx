import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Screen } from '../types';
import { authRepository } from '../data';

interface SignInProps {
  onNavigate: (screen: Screen) => void;
  onAuthSuccess: () => void;
}

type Tab = 'signin' | 'signup';

// ─── Per-tab form state ───────────────────────────────────────────────────────

interface SignInForm { email: string; password: string }
interface SignUpForm { displayName: string; email: string; password: string; confirmPassword: string }

const emptySignIn: SignInForm = { email: '', password: '' };
const emptySignUp: SignUpForm = { displayName: '', email: '', password: '', confirmPassword: '' };

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSignIn(form: SignInForm): string | null {
  if (!form.email.trim()) return 'Email is required.';
  if (!form.password) return 'Password is required.';
  return null;
}

function validateSignUp(form: SignUpForm): string | null {
  if (!form.displayName.trim()) return 'Display name is required.';
  if (!form.email.trim()) return 'Email is required.';
  if (!form.password) return 'Password is required.';
  if (form.password.length < 6) return 'Password must be at least 6 characters.';
  if (form.password !== form.confirmPassword) return 'Passwords do not match.';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignIn({ onNavigate, onAuthSuccess }: SignInProps) {
  const [tab, setTab] = useState<Tab>('signin');

  // Separate form state per tab so switching doesn't bleed data
  const [signInForm, setSignInForm] = useState<SignInForm>(emptySignIn);
  const [signUpForm, setSignUpForm] = useState<SignUpForm>(emptySignUp);

  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingSignUp, setLoadingSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setSignUpSuccess(false);
  };

  // ── Sign-in handler ──────────────────────────────────────────────────────

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const err = validateSignIn(signInForm);
    if (err) { setError(err); return; }

    setLoadingSignIn(true);
    try {
      const result = await authRepository.signIn({
        email: signInForm.email.trim(),
        password: signInForm.password,
      });
      if (!result.ok) { setError(result.error.message); return; }
      onAuthSuccess();
    } finally {
      setLoadingSignIn(false);
    }
  };

  // ── Sign-up handler ──────────────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const err = validateSignUp(signUpForm);
    if (err) { setError(err); return; }

    setLoadingSignUp(true);
    try {
      const result = await authRepository.signUp({
        email: signUpForm.email.trim(),
        password: signUpForm.password,
        name: signUpForm.displayName.trim(),
      });
      if (!result.ok) { setError(result.error.message); return; }
      // Auto sign-in after successful sign-up
      onAuthSuccess();
    } finally {
      setLoadingSignUp(false);
    }
  };

  // ── Shared UI helpers ────────────────────────────────────────────────────

  const InputIcon = ({ icon }: { icon: React.ReactNode }) => (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
      {icon}
    </span>
  );

  const Field = ({
    id, label, type = 'text', placeholder, value, onChange, autoComplete, disabled,
  }: {
    id: string; label: string; type?: string; placeholder: string;
    value: string; onChange: (v: string) => void;
    autoComplete?: string; disabled: boolean;
  }) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <InputIcon icon={
          type === 'email' ? <Mail size={15} /> :
          type === 'password' ? <Lock size={15} /> :
          <User size={15} />
        } />
        <input
          id={id} type={type} className="input pl-9"
          placeholder={placeholder} value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete} disabled={disabled}
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-800 text-ink-900">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-500 mt-2">
            {tab === 'signin'
              ? 'Sign in to access your trips and itineraries.'
              : 'Start planning your perfect trip today.'}
          </p>
        </div>

        <div className="card p-8">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-ink-100 p-1 mb-6">
            {(['signin', 'signup'] as Tab[]).map((t) => (
              <button
                key={t} type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-600 transition ${
                  tab === t
                    ? 'bg-white text-ink-900 shadow-soft'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
              <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {/* Sign-up success (email confirmation prompt if enabled) */}
          {signUpSuccess && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">
                Account created! Check your inbox to confirm your email, then sign in.
              </p>
            </div>
          )}

          {/* ── SIGN-IN FORM ── */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <Field
                id="si-email" label="Email address" type="email"
                placeholder="you@example.com" value={signInForm.email}
                onChange={(v) => setSignInForm((f) => ({ ...f, email: v }))}
                autoComplete="email" disabled={loadingSignIn}
              />
              <Field
                id="si-password" label="Password" type="password"
                placeholder="••••••••" value={signInForm.password}
                onChange={(v) => setSignInForm((f) => ({ ...f, password: v }))}
                autoComplete="current-password" disabled={loadingSignIn}
              />
              <button
                type="submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={loadingSignIn}
              >
                {loadingSignIn ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <><span>Sign in</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}

          {/* ── SIGN-UP FORM ── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4" noValidate>
              <Field
                id="su-name" label="Display name"
                placeholder="Jane Smith" value={signUpForm.displayName}
                onChange={(v) => setSignUpForm((f) => ({ ...f, displayName: v }))}
                autoComplete="name" disabled={loadingSignUp}
              />
              <Field
                id="su-email" label="Email address" type="email"
                placeholder="you@example.com" value={signUpForm.email}
                onChange={(v) => setSignUpForm((f) => ({ ...f, email: v }))}
                autoComplete="email" disabled={loadingSignUp}
              />
              <Field
                id="su-password" label="Password" type="password"
                placeholder="At least 6 characters" value={signUpForm.password}
                onChange={(v) => setSignUpForm((f) => ({ ...f, password: v }))}
                autoComplete="new-password" disabled={loadingSignUp}
              />
              <div>
                <label htmlFor="su-confirm" className="label">Confirm password</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">
                    <Lock size={15} />
                  </span>
                  <input
                    id="su-confirm" type="password"
                    className={`input pl-9 ${
                      signUpForm.confirmPassword && signUpForm.confirmPassword !== signUpForm.password
                        ? 'border-rose-300 focus:ring-rose-500'
                        : ''
                    }`}
                    placeholder="Repeat your password"
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    disabled={loadingSignUp}
                  />
                  {signUpForm.confirmPassword && signUpForm.confirmPassword === signUpForm.password && (
                    <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  )}
                </div>
                {signUpForm.confirmPassword && signUpForm.confirmPassword !== signUpForm.password && (
                  <p className="mt-1 text-xs text-rose-600">Passwords do not match.</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={loadingSignUp}
              >
                {loadingSignUp ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <><span>Create account</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-ink-100 text-center">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'landing' })}
              className="text-xs text-ink-400 hover:text-ink-600 transition"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
