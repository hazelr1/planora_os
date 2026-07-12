import { supabase } from '../../../lib/supabase';
import type { User } from '../../../types';
import type { Result } from '../../databaseErrors';
import { ok, internal } from '../../databaseErrors';
import type { IAuthRepository, SignUpInput, SignInInput, AuthStateChangeCallback } from '../authRepository';

// Map Supabase error messages to user-friendly strings
function friendlyAuthError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('email not confirmed')) {
    return 'Invalid email or password. Please try again.';
  }
  if (msg.includes('already registered') || msg.includes('user already exists') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}

function mapSupabaseUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.name as string | undefined) ?? '',
  };
}

class SupabaseAuthRepository implements IAuthRepository {
  async getCurrentUser(): Promise<Result<User | null>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return ok(null);
      return ok(mapSupabaseUser(user));
    } catch {
      return ok(null);
    }
  }

  async signUp(input: SignUpInput): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { name: input.name } },
    });

    if (error) {
      return { ok: false, error: internal(friendlyAuthError(error.message)) };
    }
    if (!data.user) {
      return { ok: false, error: internal('Sign-up succeeded but no user was returned.') };
    }

    // Persist display name in the profiles table
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: input.email,
      full_name: input.name,
    });
    if (profileErr) {
      console.warn('Profile upsert failed:', profileErr.message);
    }

    return ok(mapSupabaseUser(data.user));
  }

  async signIn(input: SignInInput): Promise<Result<User>> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      return { ok: false, error: internal(friendlyAuthError(error.message)) };
    }
    if (!data.user) {
      return { ok: false, error: internal('Sign-in succeeded but no user was returned.') };
    }

    return ok(mapSupabaseUser(data.user));
  }

  async signOut(): Promise<Result<void>> {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: internal(error.message) };
    return ok(undefined);
  }

  onAuthStateChange(callback: AuthStateChangeCallback): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          callback(null);
          return;
        }
        callback(mapSupabaseUser(session.user));
      })();
    });
    return () => subscription.unsubscribe();
  }
}

export const supabaseAuthRepository: IAuthRepository = new SupabaseAuthRepository();
