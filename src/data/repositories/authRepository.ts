/**
 * authRepository.ts
 *
 * Manages authentication state. The in-memory implementation is a stub that
 * simulates a signed-out state. When wired to Supabase, replace
 * InMemoryAuthRepository with a SupabaseAuthRepository that calls
 * supabase.auth.* methods.
 */

import type { Result } from '../databaseErrors';
import { ok, unauthorized } from '../databaseErrors';
import { store } from '../memoryStore';
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

// ─── In-memory implementation ─────────────────────────────────────────────────

class InMemoryAuthRepository implements IAuthRepository {
  private listeners: Set<AuthStateChangeCallback> = new Set();

  async getCurrentUser(): Promise<Result<User | null>> {
    if (!store.currentUserId) return ok(null);
    // In-memory stub: construct a mock user from the store
    return ok({ id: store.currentUserId, email: 'demo@planora.app', name: 'Demo User' });
  }

  async signUp(input: SignUpInput): Promise<Result<User>> {
    const user: User = { id: `user-${Date.now()}`, email: input.email, name: input.name };
    store.currentUserId = user.id;
    this.notify(user);
    return ok(user);
  }

  async signIn(input: SignInInput): Promise<Result<User>> {
    // Stub: any credentials succeed in-memory
    const user: User = { id: `user-${Date.now()}`, email: input.email, name: input.email.split('@')[0] };
    store.currentUserId = user.id;
    this.notify(user);
    return ok(user);
  }

  async signOut(): Promise<Result<void>> {
    store.currentUserId = null;
    this.notify(null);
    return ok(undefined);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(user: User | null): void {
    this.listeners.forEach((cb) => cb(user));
  }
}

export const authRepository: IAuthRepository = new InMemoryAuthRepository();
