import { useState, useCallback, useEffect, useRef } from 'react';
import AppShell from './components/AppShell';
import AnimatedBackground from './components/AnimatedBackground';
import Landing from './views/Landing';
import SignIn from './views/SignIn';
import ResetPassword from './views/ResetPassword';
import MyTrips from './views/MyTrips';
import CreateTrip from './views/CreateTrip';
import Workspace from './views/Workspace';
import { useTrips } from './hooks/useTrips';
import { useAuth } from './hooks/useAuth';
import type { Screen } from './types';
import { supabase } from './lib/supabase';
import { authRepository } from './data';

// Screens that require an authenticated session
const PROTECTED: Screen['name'][] = ['trips', 'create', 'workspace'];

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'landing' });
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);

  const { user, status, signOut } = useAuth();
  const { trips, isLoading, loadError, retryLoad, updateTripFields, duplicateTrip, deleteTrip } = useTrips(user);

  // Sign-up must never auto-navigate the user anywhere. If the Supabase
  // project happens to establish a session as a side effect of sign-up (e.g.
  // email confirmation disabled), this flag tells the route-protection effect
  // below to ignore that transient "authenticated" transition while the
  // SignIn view is in the middle of handling its own sign-up flow.
  const suppressAuthRedirectRef = useRef(false);

  // ── Route protection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && PROTECTED.includes(screen.name)) {
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
  }, [status, screen.name, pendingScreen]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // The trips list is fetched once by useTrips and otherwise only kept in
    // sync by its own mutation methods (update/duplicate/delete) — creating
    // a trip (CreateTrip's AI generation) and resetting the demo trip both
    // insert/replace a trip through a different path entirely, so without
    // this the list silently omitted whatever was just created until a full
    // page reload. Refreshing on every arrival at "My Trips" guarantees it's
    // always current regardless of which path changed it.
    if (s.name === 'trips') void retryLoad();
    setScreen(s);
  }, [status, retryLoad]);

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
        <Landing onNavigate={navigate} onTryDemo={handleTryDemo} />
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
        />
      )}

      {screen.name === 'create' && (
        <CreateTrip onNavigate={navigate} onCreate={handleCreate} />
      )}

      {screen.name === 'workspace' && (
        <Workspace
          tripId={screen.tripId}
          onNavigate={navigate}
          onUpdateTripFields={updateTripFields}
        />
      )}
    </AppShell>
    </>
  );
}
