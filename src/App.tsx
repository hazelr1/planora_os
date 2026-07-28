import { useState, useCallback, useEffect, useRef } from 'react';
import AppShell from './components/AppShell';
import AnimatedBackground from './components/AnimatedBackground';
import Landing from './views/Landing';
import SignIn from './views/SignIn';
import ResetPassword from './views/ResetPassword';
import MyTrips from './views/MyTrips';
import CreateTrip from './views/CreateTrip';
import PasteTrip from './views/PasteTrip';
import Workspace from './views/Workspace';
import BrowseTemplates from './views/BrowseTemplates';
import TemplateWorkspace from './views/TemplateWorkspace';
import Settings from './views/Settings';
import ContactUs from './views/ContactUs';
import { useTrips } from './hooks/useTrips';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import type { Screen } from './types';
import { supabase } from './lib/supabase';
import { authRepository } from './data';

// Screens that require an authenticated session
const PROTECTED: Screen['name'][] = ['trips', 'create', 'paste-trip', 'workspace', 'settings', 'browse-templates', 'template'];

// Screens a demo session can't reach — no AI trip generation (cost/abuse:
// the seeded trip plus cloning suggested plans is the whole demo trip
// budget) and no account changes (renaming, deleting an account that's
// going to be swept up by the demo-cleanup job anyway).
const DEMO_BLOCKED: Screen['name'][] = ['create', 'paste-trip', 'settings'];

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'landing' });
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);

  const { user, status, signOut } = useAuth();
  const { trips, isLoading, loadError, retryLoad, updateTripFields, duplicateTrip, deleteTrip } = useTrips(user);
  const { setMode } = useTheme();

  // Demo accounts can't reach Settings (see DEMO_BLOCKED) — the theme
  // toggle lives there, so a demo session has no way to override whatever
  // mode happens to be left in localStorage from a previous session on
  // this browser. Forcing 'system' here means a fresh demo always follows
  // the OS preference instead of being stuck on an unrelated stored choice.
  useEffect(() => {
    if (user?.isDemo) setMode('system');
  }, [user?.isDemo, setMode]);

  // Sign-up must never auto-navigate the user anywhere. If the Supabase
  // project happens to establish a session as a side effect of sign-up (e.g.
  // email confirmation disabled), this flag tells the route-protection effect
  // below to ignore that transient "authenticated" transition while the
  // SignIn view is in the middle of handling its own sign-up flow.
  const suppressAuthRedirectRef = useRef(false);

  // Tracks whether the most recently known session was a demo account, so
  // that if it disappears out from under the user (the hourly demo-cleanup
  // job deleted it — see supabase/functions/delete-expired-demo-accounts)
  // while they're still on a protected screen, the route-protection effect
  // below can tell that apart from an ordinary "never signed in" visitor and
  // send them somewhere explained rather than a bare sign-in form. Cleared
  // by handleSignOut so a deliberate sign-out never triggers this path.
  const wasDemoRef = useRef(false);
  const [demoSessionExpired, setDemoSessionExpired] = useState(false);

  useEffect(() => {
    if (user) wasDemoRef.current = user.isDemo;
  }, [user]);

  // ── Route protection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && PROTECTED.includes(screen.name)) {
      // The demo-cleanup job deleted this account out from under an active
      // session (or its access token simply outlived a deleted user) —
      // land on an explained landing page, not a bare, unexplained sign-in
      // form. wasDemoRef is cleared by handleSignOut, so this never fires
      // for a deliberate sign-out.
      if (wasDemoRef.current) {
        wasDemoRef.current = false;
        setPendingScreen(null);
        setDemoSessionExpired(true);
        setScreen({ name: 'landing' });
        return;
      }
      setPendingScreen(screen);
      setScreen({ name: 'signin' });
      return;
    }

    // After demo launch: user was on 'landing' with a pendingScreen set
    // Once authenticated, navigate to the pending screen (workspace with demo trip)
    if (status === 'authenticated' && pendingScreen) {
      setScreen(pendingScreen);
      setPendingScreen(null);
      return;
    }

    if (status === 'authenticated' && screen.name === 'signin') {
      // Only handleSignUpSettled clears this — see its comment for why this
      // effect must not clear it itself, even on the very transition it's
      // suppressing.
      if (suppressAuthRedirectRef.current) return;
      setScreen({ name: 'trips' });
    }

    // Defense-in-depth mirror of the same check in navigate() below — catches
    // a demo session landing on a blocked screen via any path other than a
    // direct navigate() call (e.g. a stale pendingScreen).
    if (status === 'authenticated' && user?.isDemo && DEMO_BLOCKED.includes(screen.name)) {
      setScreen({ name: 'trips' });
    }
  }, [status, screen.name, pendingScreen, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Password recovery ─────────────────────────────────────────────────────
  // Fires when the user arrives via a "reset your password" email link —
  // Supabase establishes a temporary session from the link and emits this
  // event regardless of what screen the app happened to load on.
  useEffect(() => {
    return authRepository.onPasswordRecovery(() => {
      setPendingScreen(null);
      setScreen({ name: 'reset-password' });
    });
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = useCallback((s: Screen) => {
    if (status === 'unauthenticated' && PROTECTED.includes(s.name)) {
      setPendingScreen(s);
      setScreen({ name: 'signin' });
      return;
    }
    // Demo sessions don't get AI trip generation or account settings — see
    // DEMO_BLOCKED. Redirect to My Trips rather than silently no-op-ing, so
    // there's always somewhere sensible to land.
    if (user?.isDemo && DEMO_BLOCKED.includes(s.name)) {
      setScreen({ name: 'trips' });
      return;
    }
    // The trips list is fetched once by useTrips and otherwise only kept in
    // sync by its own mutation methods (update/duplicate/delete) — creating
    // a trip (CreateTrip's AI generation) and resetting the demo trip both
    // insert/replace a trip through a different path entirely, so without
    // this the list silently omitted whatever was just created until a full
    // page reload. Refreshing on every arrival at "My Trips" guarantees it's
    // always current regardless of which path changed it.
    if (s.name === 'trips') void retryLoad();
    if (s.name !== 'landing') setDemoSessionExpired(false);
    setScreen(s);
  }, [status, retryLoad, user]);

  // ── Auth callbacks ────────────────────────────────────────────────────────
  const handleAuthSuccess = useCallback(() => {
    // onAuthStateChange in useAuth handles the redirect via the effect above
  }, []);

  const handleSignUpStart = useCallback(() => {
    suppressAuthRedirectRef.current = true;
  }, []);

  const handleSignUpSettled = useCallback(() => {
    // supabase-js dispatches auth state changes (the transient SIGNED_IN,
    // then the deliberate SIGNED_OUT from supabaseAuthRepository.signUp)
    // asynchronously — they can still be in flight when the signUp() promise
    // this callback follows has already resolved. Clearing the suppression
    // immediately let the very first of those events sneak past this guard
    // and briefly navigate away from Sign In, which remounted it and wiped
    // the "check your inbox" confirmation card before anyone saw it. Waiting
    // one tick past any reasonable auth-event delivery window lets both
    // transient events pass through useAuth's onAuthStateChange listener
    // while still ignored below, and this only ever risks masking one
    // nearly instant real sign-in from this same screen.
    setTimeout(() => {
      suppressAuthRedirectRef.current = false;
    }, 800);
  }, []);

  const handleSignOut = useCallback(async () => {
    // A deliberate sign-out must never be mistaken for the demo-cleanup job
    // deleting the account out from under an active session.
    wasDemoRef.current = false;
    await signOut();
    setScreen({ name: 'landing' });
  }, [signOut]);

  // ── Trip creation ─────────────────────────────────────────────────────────
  const handleCreate = useCallback((tripId: string) => {
    setScreen({ name: 'workspace', tripId });
  }, []);

  // ── Demo launch ───────────────────────────────────────────────────────────
  const handleTryDemo = useCallback(async () => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/launch-demo`,
      {
        method: 'POST',
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        signal: AbortSignal.timeout(30_000),
      },
    );
    const json = await res.json() as {
      access_token?: string;
      refresh_token?: string;
      trip_id?: string;
      error?: string;
    };

    if (!res.ok || !json.trip_id || !json.access_token || !json.refresh_token) {
      throw new Error(json.error ?? 'Demo launch failed. Please try again.');
    }

    // Queue the destination — the route-protection effect will navigate here
    // as soon as onAuthStateChange fires and status becomes 'authenticated'
    setPendingScreen({ name: 'workspace', tripId: json.trip_id });

    // Set the demo session — triggers onAuthStateChange → status 'authenticated'
    await supabase.auth.setSession({
      access_token: json.access_token,
      refresh_token: json.refresh_token,
    });
  }, []);

  // ── Loading gate (session check) ──────────────────────────────────────────
  if (status === 'loading') {
    return (
      <>
        <AnimatedBackground />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
            <p className="text-sm text-ink-600">Checking session…</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
    <AnimatedBackground />
    <AppShell screen={screen} onNavigate={navigate} user={user} onSignOut={handleSignOut} fullBleed={screen.name === 'workspace'}>
      {screen.name === 'landing' && (
        <Landing
          onNavigate={navigate}
          onTryDemo={handleTryDemo}
          isDemo={user?.isDemo ?? false}
          sessionExpiredNotice={demoSessionExpired}
          onDismissSessionExpiredNotice={() => setDemoSessionExpired(false)}
        />
      )}

      {screen.name === 'signin' && (
        <SignIn
          onNavigate={navigate}
          onAuthSuccess={handleAuthSuccess}
          onSignUpStart={handleSignUpStart}
          onSignUpSettled={handleSignUpSettled}
        />
      )}

      {screen.name === 'reset-password' && (
        <ResetPassword onDone={() => setScreen({ name: 'trips' })} />
      )}

      {screen.name === 'trips' && (
        <MyTrips
          trips={trips}
          isLoading={isLoading}
          loadError={loadError}
          onRetryLoad={retryLoad}
          onNavigate={navigate}
          onDuplicate={duplicateTrip}
          onDelete={deleteTrip}
          onUpdateTripFields={updateTripFields}
          isDemo={user?.isDemo ?? false}
        />
      )}

      {screen.name === 'create' && !user?.isDemo && (
        <CreateTrip onNavigate={navigate} onCreate={handleCreate} />
      )}

      {screen.name === 'paste-trip' && !user?.isDemo && (
        <PasteTrip onNavigate={navigate} onCreate={handleCreate} />
      )}

      {screen.name === 'workspace' && (
        <Workspace
          tripId={screen.tripId}
          onNavigate={navigate}
          onUpdateTripFields={updateTripFields}
        />
      )}

      {screen.name === 'browse-templates' && (
        <BrowseTemplates onNavigate={navigate} />
      )}

      {screen.name === 'template' && (
        <TemplateWorkspace
          templateId={screen.templateId}
          onNavigate={navigate}
          onUpdateTripFields={updateTripFields}
        />
      )}

      {screen.name === 'settings' && user && !user.isDemo && (
        <Settings user={user} onSignOut={handleSignOut} />
      )}

      {screen.name === 'contact' && <ContactUs />}
    </AppShell>
    </>
  );
}
