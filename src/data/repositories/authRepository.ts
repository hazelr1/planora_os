/**
 * authRepository.ts
 *
 * Manages authentication state. The in-memory implementation is a stub that
 * simulates a signed-out state. When wired to Supabase, replace
 * InMemoryAuthRepository with a SupabaseAuthRepository that calls
 * supabase.auth.* methods.
 */

import type { Result } from '../databaseErrors';
import type { User } from '../../types';

// ─── Input types ──────────────────────────────────────────────────────────────

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export type AuthStateChangeCallback = (user: User | null) => void;

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IAuthRepository {
  /** Returns the currently authenticated user, or null if signed out. */
  getCurrentUser(): Promise<Result<User | null>>;

  /** Creates a new account and signs in. */
  signUp(input: SignUpInput): Promise<Result<User>>;

  /** Signs in with email and password. */
  signIn(input: SignInInput): Promise<Result<User>>;

  /** Signs out the current user. */
  signOut(): Promise<Result<void>>;

  /**
   * Registers a listener that fires whenever auth state changes.
   * Returns an unsubscribe function.
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void;
}
