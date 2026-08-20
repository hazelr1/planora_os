import type { IAuthRepository, SignInInput, SignUpInput, AuthStateChangeCallback } from './authRepository';
import type { Result } from '../databaseErrors';
import { ok, internal } from '../databaseErrors';
import type { User } from '../../types';
import { store, generateId } from '../memoryStore';

class InMemoryAuthRepository implements IAuthRepository {
  private listeners: AuthStateChangeCallback[] = [];

  async getCurrentUser(): Promise<Result<User | null>> {
    if (!store.currentUserId) return ok(null);
    const profile = store.profiles.find((p) => p.userId === store.currentUserId);
    if (!profile) return ok(null);
    return ok({ id: store.currentUserId, email: profile.email ?? '', name: profile.name ?? '', isDemo: !!profile.preferences?.isDemo, demoExpiresAt: null });
  }

  async signUp(_input: SignUpInput): Promise<Result<User>> {
    // In-memory sign-up is not supported for prototyping; return an error.
    return { ok: false, error: internal('Sign-up is disabled in local demo mode.') };
  }

  async signIn(_input: SignInInput): Promise<Result<User>> {
    return { ok: false, error: internal('Sign-in is disabled in local demo mode.') };
  }

  async signOut(): Promise<Result<void>> {
    store.currentUserId = null;
    this.listeners.forEach((l) => l(null));
    return ok(undefined);
  }

  async requestPasswordReset(_email: string): Promise<Result<void>> {
    return { ok: false, error: internal('Password reset is not available in local demo mode.') };
  }

  async updatePassword(_newPassword: string): Promise<Result<void>> {
    return { ok: false, error: internal('Password update is not available in local demo mode.') };
  }

  async updateName(name: string): Promise<Result<User>> {
    if (!store.currentUserId) return { ok: false, error: internal('Not signed in.') };
    const profile = store.profiles.find((p) => p.userId === store.currentUserId);
    if (!profile) return { ok: false, error: internal('Profile not found.') };
    profile.name = name;
    const user: User = { id: store.currentUserId, email: profile.email ?? '', name: profile.name ?? '', isDemo: false, demoExpiresAt: null };
    this.listeners.forEach((l) => l(user));
    return ok(user);
  }

  async deleteAccount(): Promise<Result<void>> {
    if (!store.currentUserId) return { ok: false, error: internal('Not signed in.') };
    store.trips = store.trips.filter((t) => t.id !== store.currentUserId);
    store.profiles = store.profiles.filter((p) => p.userId !== store.currentUserId);
    store.currentUserId = null;
    this.listeners.forEach((l) => l(null));
    return ok(undefined);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    this.listeners.push(callback);
    // Immediately invoke with current state
    (async () => {
      const user = await this.getCurrentUser();
      callback(user.ok ? user.data ?? null : null);
    })();
    return () => { this.listeners = this.listeners.filter((l) => l !== callback); };
  }

  onPasswordRecovery(_callback: () => void): () => void {
    return () => {};
  }
}

export const inMemoryAuthRepository = new InMemoryAuthRepository();
