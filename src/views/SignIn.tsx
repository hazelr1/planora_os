import { useRef, useState } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, X } from 'lucide-react';
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
  // Supabase's own signup/email rate limit is strict and project-wide (the
  // built-in email service on the free tier is quota'd to a handful of
  // sends per hour) — a retry fired the instant the first attempt errors
  // burns more of that same scarce quota for no benefit. This doesn't lift
  // the underlying limit (only custom SMTP or the dashboard's rate-limit
  // settings can), but it stops our own client from being the thing that
  // trips it on an impatient double-submit for the same address.
  const lastSignUpAttemptRef = useRef<{ email: string; at: number } | null>(null);
  const SIGNUP_RETRY_COOLDOWN_MS = 20_000;

  // ── Forgot password ──────────────────────────────────────────────────────
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // After a successful sign-up we show an "email verification" popup. The
  // user is never auto-signed-in and never auto-navigated away from this
  // page — they must explicitly dismiss the popup (click the X), at which
  // point we drop them onto the Sign In tab of this same page.
  const closeSignUpSuccess = () => {
    setSignUpSuccess(false);
    setTab('signin');
  };

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

    const email = signUpForm.email.trim();
    const last = lastSignUpAttemptRef.current;
    if (last && last.email.toLowerCase() === email.toLowerCase()) {
      const waitedMs = Date.now() - last.at;
      if (waitedMs < SIGNUP_RETRY_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((SIGNUP_RETRY_COOLDOWN_MS - waitedMs) / 1000);
        setError(`Please wait ${waitSeconds}s before trying that email again — the confirmation email may already be on its way.`);
        return;
      }
    }
    lastSignUpAttemptRef.current = { email, at: Date.now() };

    setLoadingSignUp(true);
    onSignUpStart?.();
    try {
      const result = await authRepository.signUp({
        email,
        password: signUpForm.password,
        name: signUpForm.displayName.trim(),
      });
      if (!result.ok) { setError(result.error.message); return; }
      // Do NOT auto sign-in: the account may still need email verification,
      // and even when it doesn't, sign-up should never double as sign-in.
      // Show the email-verification popup instead; closeSignUpSuccess()
      // moves the user to the Sign In tab once they dismiss it.
      setSignUpForm(emptySignUp);
      setSignUpSuccess(true);
    } finally {
      setLoadingSignUp(false);
      onSignUpSettled?.();
    }
  };

  // ── Forgot password handlers ─────────────────────────────────────────────

  const openForgotPassword = () => {
    setForgotEmail(signInForm.email.trim());
    setForgotError(null);
    setForgotSent(false);
    setForgotMode(true);
  };

  const closeForgotPassword = () => {
    setForgotMode(false);
    setForgotSent(false);
    setForgotError(null);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError('Email is required.'); return; }

    setForgotError(null);
    setForgotLoading(true);
    try {
      const result = await authRepository.requestPasswordReset(forgotEmail.trim());
      if (!result.ok) { setForgotError(result.error.message); return; }
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      {/* Email verification popup — shown after a successful sign-up. It sits
          on top of the sign-in page and only goes away when the user clicks
          the X in its top-left corner; there is no auto-dismiss and no
          backdrop-click-to-close, so the message can't be missed. */}
      {signUpSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
          <div className="card relative w-full max-w-sm p-6 pt-8 shadow-pop animate-scale-in" role="dialog" aria-modal="true" aria-labelledby="verify-email-heading">
            <button
              type="button"
              onClick={closeSignUpSuccess}
              aria-label="Close"
              className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-200/60 hover:text-ink-900"
            >
              <X size={16} />
            </button>
            <div className="flex flex-col items-center pt-2 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 size={24} className="text-emerald-800 dark:text-emerald-400" />
              </div>
              <h2 id="verify-email-heading" className="font-display text-lg font-700 text-ink-900">
                Account created successfully.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Please verify your email using the link sent to your inbox before signing in.
              </p>
            </div>
          </div>
        </div>
      )}

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
          {/* Forgot password — a focused email-only form that replaces the
              tabs/forms until the user goes back or a reset link is sent. */}
          {forgotMode ? (
            <div>
              <h2 className="font-display text-lg font-700 text-ink-900 mb-1">Reset your password</h2>
              <p className="text-sm text-ink-600 mb-5">
                Enter your account email and we'll send you a link to set a new password.
              </p>

              {forgotSent ? (
                <div className="rounded-xl bg-emerald-500/10 px-4 py-4 flex items-start gap-3 animate-scale-in" role="status">
                  <CheckCircle2 size={18} className="text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Check your inbox.</p>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300/80 mt-1 leading-relaxed">
                      If an account exists for {forgotEmail.trim()}, we've sent a link to reset your password.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
                  {forgotError && (
                    <div className="rounded-xl bg-rose-500/10 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
                      <AlertCircle size={15} className="text-rose-800 dark:text-rose-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-800 dark:text-rose-300">{forgotError}</p>
                    </div>
                  )}
                  <Field
                    id="forgot-email" label="Email address" type="email"
                    placeholder="you@example.com" value={forgotEmail}
                    onChange={setForgotEmail}
                    autoComplete="email" disabled={forgotLoading}
                  />
                  <button
                    type="submit"
                    className="btn-primary w-full justify-center mt-2"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-glass/30 border-t-white animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      <><span>Send reset link</span><ArrowRight size={15} /></>
                    )}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={closeForgotPassword}
                className="btn-ghost w-full mt-3 justify-center text-sm"
              >
                Back to sign in
              </button>
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
                <div className="mb-5 rounded-xl bg-rose-500/10 px-4 py-3 flex items-start gap-2.5 animate-scale-in">
                  <AlertCircle size={15} className="text-rose-800 dark:text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-800 dark:text-rose-300">{error}</p>
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
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs text-ink-500 hover:text-brand-700 dark:hover:text-brand-300 transition"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={loadingSignIn}
              >
                {loadingSignIn ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
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
                    <CheckCircle2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-800 dark:text-emerald-400" />
                  )}
                </div>
                {signUpForm.confirmPassword && signUpForm.confirmPassword !== signUpForm.password && (
                  <p className="mt-1 text-xs text-rose-800 dark:text-rose-400">Passwords do not match.</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center mt-2"
                disabled={loadingSignUp}
              >
                {loadingSignUp ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
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
          <div className="mt-6 pt-5 border-t border-glass/10 text-center">
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