/**
 * profileRepository.ts
 *
 * Manages user profile data. In-memory implementation stores profiles in the
 * shared MemoryStore. When wired to Supabase, replace InMemoryProfileRepository
 * with a SupabaseProfileRepository that queries the `public.profiles` table.
 */

import type { Result } from '../databaseErrors';
import { ok, notFound } from '../databaseErrors';
import { store, generateId } from '../memoryStore';

// ─── Application model ────────────────────────────────────────────────────────

/**
 * A rolling, lightweight snapshot of trip preferences — derived from
 * whichever trip a user most recently created or edited (see
 * src/lib/tripPreferences.ts and the matching heuristic duplicated into
 * generate-itinerary/generate-trip-from-text), not an accumulated history.
 * Every key is optional: a given trip edit rarely has signal for all three,
 * and updatePreferences merges rather than overwrites, so an edit that only
 * touches budget never erases a previously-learned pace or kids tag.
 */
export interface TripPreferenceTags {
  pace?: 'slow' | 'moderate' | 'packed';
  travelsWithKids?: 'yes' | 'no';
  budgetTier?: 'budget' | 'mid-range' | 'luxury';
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  preferences: TripPreferenceTags;
  createdAt: string;
  updatedAt: string;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateProfileInput {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IProfileRepository {
  /** Retrieves the profile for the given user ID. */
  getProfile(userId: string): Promise<Result<Profile>>;

  /** Creates a new profile record (called after successful sign-up). */
  createProfile(input: CreateProfileInput): Promise<Result<Profile>>;

  /** Updates mutable fields on an existing profile. */
  updateProfile(userId: string, updates: UpdateProfileInput): Promise<Result<Profile>>;

  /**
   * Merges the given tags onto the profile's existing preferences (only the
   * keys present in `tags` are touched — this is a patch, not a replace).
   */
  updatePreferences(userId: string, tags: Partial<TripPreferenceTags>): Promise<Result<Profile>>;
}

// ─── In-memory implementation ─────────────────────────────────────────────────

class InMemoryProfileRepository implements IProfileRepository {
  async getProfile(userId: string): Promise<Result<Profile>> {
    const profile = store.profiles.find((p) => p.userId === userId);
    if (!profile) return { ok: false, error: notFound('profile', userId) };
    return ok(profile);
  }

  async createProfile(input: CreateProfileInput): Promise<Result<Profile>> {
    const now = new Date().toISOString();
    const profile: Profile = {
      id: generateId(),
      userId: input.userId,
      name: input.name,
      email: input.email,
      avatarUrl: input.avatarUrl ?? null,
      preferences: {},
      createdAt: now,
      updatedAt: now,
    };
    store.profiles.push(profile);
    return ok(profile);
  }

  async updateProfile(userId: string, updates: UpdateProfileInput): Promise<Result<Profile>> {
    const idx = store.profiles.findIndex((p) => p.userId === userId);
    if (idx < 0) return { ok: false, error: notFound('profile', userId) };
    store.profiles[idx] = {
      ...store.profiles[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return ok(store.profiles[idx]);
  }

  async updatePreferences(userId: string, tags: Partial<TripPreferenceTags>): Promise<Result<Profile>> {
    const idx = store.profiles.findIndex((p) => p.userId === userId);
    if (idx < 0) return { ok: false, error: notFound('profile', userId) };
    store.profiles[idx] = {
      ...store.profiles[idx],
      preferences: { ...store.profiles[idx].preferences, ...tags },
      updatedAt: new Date().toISOString(),
    };
    return ok(store.profiles[idx]);
  }
}

export const profileRepository: IProfileRepository = new InMemoryProfileRepository();
