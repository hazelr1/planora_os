import { supabase } from '../../../lib/supabase';
import { ok, notFound, internal } from '../../databaseErrors';
import type { Result } from '../../databaseErrors';
import type { IProfileRepository, Profile, CreateProfileInput, UpdateProfileInput, TripPreferenceTags } from '../profileRepository';

// DB row shape for profiles table (full_name is the actual column name)
interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  preferences: TripPreferenceTags | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DbProfile): Profile {
  return {
    id: row.id,
    userId: row.id,
    name: row.full_name,
    email: row.email,
    avatarUrl: row.avatar_url ?? '',
    preferences: row.preferences ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseProfileRepository implements IProfileRepository {
  async getProfile(userId: string): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('profile', userId) };
    return ok(mapRow(data as DbProfile));
  }

  async createProfile(input: CreateProfileInput): Promise<Result<Profile>> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: input.userId, email: input.email, full_name: input.name })
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: internal('Profile upsert returned no data.') };
    return ok(mapRow(data as DbProfile));
  }

  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<Result<Profile>> {
    const patch: Partial<DbProfile> = {};
    if (updates.name !== undefined) patch.full_name = updates.name;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl;

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('profile', userId) };
    return ok(mapRow(data as DbProfile));
  }

  async updatePreferences(userId: string, tags: Partial<TripPreferenceTags>): Promise<Result<Profile>> {
    // Read-modify-write rather than a raw jsonb `||` merge — supabase-js has
    // no escape hatch for that short of an RPC, and this is called at most
    // once per trip create/edit, never a hot path worth standing up one for.
    const { data: existing, error: fetchErr } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle();
    if (fetchErr) return { ok: false, error: internal(fetchErr.message) };
    if (!existing) return { ok: false, error: notFound('profile', userId) };

    const merged: TripPreferenceTags = { ...(existing.preferences as TripPreferenceTags | null ?? {}), ...tags };

    const { data, error } = await supabase
      .from('profiles')
      .update({ preferences: merged, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('profile', userId) };
    return ok(mapRow(data as DbProfile));
  }
}

export const supabaseProfileRepository: IProfileRepository = new SupabaseProfileRepository();
