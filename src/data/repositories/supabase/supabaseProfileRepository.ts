import { supabase } from '../../../lib/supabase';
import { ok, notFound, internal } from '../../databaseErrors';
import type { Result } from '../../databaseErrors';
import type { IProfileRepository, Profile, CreateProfileInput, UpdateProfileInput } from '../profileRepository';

// DB row shape for profiles table (full_name is the actual column name)
interface DbProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
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
}

export const supabaseProfileRepository: IProfileRepository = new SupabaseProfileRepository();
