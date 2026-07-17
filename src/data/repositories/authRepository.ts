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

  /** Sends a password-reset email with a link back into the app. */
  requestPasswordReset(email: string): Promise<Result<void>>;

  /** Sets a new password for the user completing a password-reset flow. */
  updatePassword(newPassword: string): Promise<Result<void>>;

  /** Updates the current user's display name. */
  updateName(name: string): Promise<Result<User>>;

  /**
   * Permanently deletes the current user's account and all owned data
   * (trips, days, activities, revisions cascade via the DB's own foreign
   * keys). Irreversible — callers must confirm with the user first.
   */
  deleteAccount(): Promise<Result<void>>;

  /**
   * Registers a listener that fires whenever auth state changes.
   * Returns an unsubscribe function.
   */
  onAuthStateChange(callback: AuthStateChangeCallback): () => void;

  /**
   * Registers a listener that fires when the user arrives via a
   * password-reset email link. Returns an unsubscribe function.
   */
  onPasswordRecovery(callback: () => void): () => void;
}
