import { useEffect, useRef, useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Screen } from '../types';
import { authRepository } from '../data';

interface SignInProps {
  onNavigate: (screen: Screen) => void;
  onAuthSuccess: () => void;
  /**
   * Called immediately before/after the sign-up request. Lets the parent
   * suppress its "authenticated -> redirect" effect in case the sign-up
   * response transiently establishes a session (e.g. email confirmation
   * disabled) — sign-up must never auto-navigate the user anywhere.
   */
  onSignUpStart?: () => void;
  onSignUpSettled?: () => void;
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

// ─── Shared form controls ─────────────────────────────────────────────────────
//
// Defined at module scope (not inside SignIn) so their component identity is
// stable across renders. Previously these were declared inside the SignIn
// function body, which meant every re-render (e.g. on each keystroke's setState)
// created a brand-new component type. React then unmounted and remounted the
// underlying <input> DOM nodes instead of just updating them, which is what
// caused focus to drop after every typed character.

function InputIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
      {icon}
    </span>
  );
}

function Field({
  id, label, type = 'text', placeholder, value, onChange, autoComplete, disabled,
}: {
  id: string; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  autoComplete?: string; disabled: boolean;
}) {
  return (
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignIn({ onNavigate, onAuthSuccess, onSignUpStart, onSignUpSettled }: SignInProps) {
  const [tab, setTab] = useState<Tab>('signin');

  // Separate form state per tab so switching doesn't bleed data
  const [signInForm, setSignInForm] = useState<SignInForm>(emptySignIn);
  const [signUpForm, setSignUpForm] = useState<SignUpForm>(emptySignUp);

  const [loadingSignIn, setLoadingSignIn] = useState(false);
  const [loadingSignUp, setLoadingSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const signUpSuccessTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // After a successful sign-up, show a confirmation card for a couple of
  // seconds, then switch back to the Sign In tab. The user is never
  // auto-signed-in and never navigated away from this page.
  useEffect(() => {
    if (!signUpSuccess) return;
    signUpSuccessTimeout.current = setTimeout(() => {
      setSignUpSuccess(false);
      setTab('signin');
    }, 2500);
    return () => {
      if (signUpSuccessTimeout.current) clearTimeout(signUpSuccessTimeout.current);
    };
  }, [signUpSuccess]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
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
    onSignUpStart?.();
    try {
      const result = await authRepository.signUp({
        email: signUpForm.email.trim(),
        password: signUpForm.password,
        name: signUpForm.displayName.trim(),
      });
      if (!result.ok) { setError(result.error.message); return; }
      // Do NOT auto sign-in: the account may still need email verification,
      // and even when it doesn't, sign-up should never double as sign-in.
      // Show a confirmation card instead; the effect above switches back to
      // the Sign In tab a couple of seconds later.
      setSignUpForm(emptySignUp);
      setSignUpSuccess(true);
    } finally {
      setLoadingSignUp(false);
      onSignUpSettled?.();
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-800 text-ink-900">
            {tab === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-ink-600 mt-2">
            {tab === 'signin'
              ? 'Sign in to access your trips and itineraries.'
              : 'Start planning your perfect trip today.'}
          </p>
        </div>

        <div className="card p-8">
          {/* Sign-up success card — shown instead of the tabs/forms until the
              auto-switch back to Sign In fires. The user is never signed in
              or navigated away here; this is purely a confirmation message. */}
          {signUpSuccess ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 flex items-start gap-3 animate-scale-in" role="status">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Account created successfully.</p>
                <p className="text-sm text-emerald-300/80 mt-1 leading-relaxed">
                  Please verify your email using the link sent to your inbox before signing in.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex rounded-xl bg-ink-200/60 p-1 mb-6">
                {(['signin', 'signup'] as Tab[]).map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => switchTab(t)}
                    className={`flex-1 rounded-lg py-2 text-sm font-600 transition ${
                      tab === t
                        ? 'bg-ink-300/80 text-ink-900 shadow-soft'
                        : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              {/* Error banner */}
              {error && (
                <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
                  <AlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300">{error}</p>
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
                    <span className="h-4 w-4 rounded-full border-2 border-ink-950/30 border-t-ink-950 animate-spin" />
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
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
                    <Lock size={15} />
                  </span>
                  <input
                    id="su-confirm" type="password"
                    className={`input pl-9 ${
                      signUpForm.confirmPassword && signUpForm.confirmPassword !== signUpForm.password
                        ? 'border-rose-500/40 focus:ring-rose-500/30'
                        : ''
                    }`}
                    placeholder="Repeat your password"
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    disabled={loadingSignUp}
                  />
                  {signUpForm.confirmPassword && signUpForm.confirmPassword === signUpForm.password && (
                    <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                  )}
                </div>
                {signUpForm.confirmPassword && signUpForm.confirmPassword !== signUpForm.password && (
                  <p className="mt-1 text-xs text-rose-400">Passwords do not match.</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={loadingSignUp}
              >
                {loadingSignUp ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-ink-950/30 border-t-ink-950 animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <><span>Create account</span><ArrowRight size={15} /></>
                )}
              </button>
            </form>
          )}
            </>
          )}

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'landing' })}
              className="text-xs text-ink-500 hover:text-ink-700 transition"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
