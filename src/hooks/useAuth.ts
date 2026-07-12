import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authRepository } from '../data';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    // Restore session on mount — reads from Supabase's stored token
    authRepository.getCurrentUser().then((result) => {
      const resolved = result.ok ? result.data : null;
      setUser(resolved);
      setStatus(resolved ? 'authenticated' : 'unauthenticated');
    });

    // Subscribe to live auth state changes (sign-in, sign-out, token refresh)
    const unsubscribe = authRepository.onAuthStateChange((u) => {
      setUser(u);
      setStatus(u ? 'authenticated' : 'unauthenticated');
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await authRepository.signOut();
    // onAuthStateChange will update state; no manual setUser needed
  }, []);

  return { user, status, signOut };
}
