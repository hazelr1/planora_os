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
    return "We've hit a temporary limit on how many account emails can go out right now. This isn't caused by anything you did wrong — please try again in a few minutes.";
  }
  return message;
}

function mapSupabaseUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.name as string | undefined) ?? '',
    isDemo: user.user_metadata?.is_demo_user === true,
    demoExpiresAt: (user.user_metadata?.demo_expires_at as string | undefined) ?? null,
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
      options: {
        data: { name: input.name },
        // Without this, the confirmation email links back to whatever "Site
        // URL" happens to be configured in the Supabase dashboard — which
        // silently drifts from wherever the app is actually deployed. Must
        // still be present in the project's Auth "Redirect URLs" allowlist,
        // or Supabase rejects the redirect with its own error page even
        // though the email itself already confirmed correctly server-side.
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      },
    });

    if (error) {
      return { ok: false, error: internal(friendlyAuthError(error.message)) };
    }
    if (!data.user) {
      return { ok: false, error: internal('Sign-up succeeded but no user was returned.') };
    }

    // Persist display name in the profiles table. This still needs the
    // freshly-created session (if any) to satisfy the profiles RLS policy,
    // so it must happen before the sign-out below.
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: input.email,
      full_name: input.name,
    });
    if (profileErr) {
      console.warn('Profile upsert failed:', profileErr.message);
    }

    // Sign-up must never double as sign-in: the account may still require
    // email verification, and even when it doesn't, the user should land on
    // a "check your inbox" message and explicitly sign in afterwards. If the
    // Supabase project has email confirmations disabled, signUp() above will
    // have already established a session — sign out of it immediately so the
    // app never treats a fresh sign-up as an authenticated session.
    if (data.session) {
      await supabase.auth.signOut();
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

  async requestPasswordReset(email: string): Promise<Result<void>> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    });
    // Supabase intentionally does not reveal whether the email is registered
    // (avoids account enumeration), so most failures here are transient
    // (network, rate limiting) rather than "no such user".
    if (error) return { ok: false, error: internal(friendlyAuthError(error.message)) };
    return ok(undefined);
  }

  async updatePassword(newPassword: string): Promise<Result<void>> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: internal(friendlyAuthError(error.message)) };
    return ok(undefined);
  }

  async updateName(name: string): Promise<Result<User>> {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: internal('Name cannot be empty.') };

    // Auth metadata is the source useAuth/getCurrentUser reads `name` from
    // (see mapSupabaseUser) — update it first so the returned User is
    // correct even if the profiles-table mirror below fails.
    const { data, error } = await supabase.auth.updateUser({ data: { name: trimmed } });
    if (error) return { ok: false, error: internal(friendlyAuthError(error.message)) };
    if (!data.user) return { ok: false, error: internal('Name update succeeded but no user was returned.') };

    // Best-effort mirror onto the profiles table (used for display elsewhere,
    // e.g. anything that reads profiles directly rather than auth metadata).
    // Non-fatal: the auth update above already succeeded and is the value
    // this app actually reads back, so a failure here shouldn't surface as
    // an error to a user who just successfully changed their name.
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ full_name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', data.user.id);
    if (profileErr) {
      console.warn('Profile name mirror failed:', profileErr.message);
    }

    return ok(mapSupabaseUser(data.user));
  }

  async deleteAccount(): Promise<Result<void>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: internal('Session expired. Please sign in again.') };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          signal: AbortSignal.timeout(30_000),
        },
      );
      const json = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok) {
        return { ok: false, error: internal(json.error ?? 'Could not delete your account. Please try again.') };
      }
      return ok(undefined);
    } catch {
      return { ok: false, error: internal('Could not delete your account. Please check your connection and try again.') };
    }
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

  onPasswordRecovery(callback: () => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') callback();
    });
    return () => subscription.unsubscribe();
  }
}

export const supabaseAuthRepository: IAuthRepository = new SupabaseAuthRepository();
