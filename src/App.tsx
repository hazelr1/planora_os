import { useState, useCallback, useEffect, useRef } from 'react';
import AppShell from './components/AppShell';
import Landing from './views/Landing';
import SignIn from './views/SignIn';
import MyTrips from './views/MyTrips';
import CreateTrip from './views/CreateTrip';
import Workspace from './views/Workspace';
import { useTrips } from './hooks/useTrips';
import { useAuth } from './hooks/useAuth';
import type { Screen } from './types';
import { supabase } from './lib/supabase';

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
      if (suppressAuthRedirectRef.current) {
        suppressAuthRedirectRef.current = false;
        return;
      }
      setScreen({ name: 'trips' });
    }
  }, [status, screen.name, pendingScreen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = useCallback((s: Screen) => {
    if (status === 'unauthenticated' && PROTECTED.includes(s.name)) {
      setPendingScreen(s);
      setScreen({ name: 'signin' });
      return;
    }
    setScreen(s);
  }, [status]);

  // ── Auth callbacks ────────────────────────────────────────────────────────
  const handleAuthSuccess = useCallback(() => {
    // onAuthStateChange in useAuth handles the redirect via the effect above
  }, []);

  const handleSignUpStart = useCallback(() => {
    suppressAuthRedirectRef.current = true;
  }, []);

  const handleSignUpSettled = useCallback(() => {
    suppressAuthRedirectRef.current = false;
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
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-brand-500/20 border-t-brand-400 animate-spin" />
          <p className="text-sm text-ink-600">Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell screen={screen} onNavigate={navigate} user={user} onSignOut={handleSignOut}>
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
  );
}
