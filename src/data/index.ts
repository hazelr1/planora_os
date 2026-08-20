/**
 * src/data/index.ts
 *
 * Single import point for all repository implementations.
 * All application code (hooks, components) must import from here — never
 * directly from an individual repository file or from supabase-js.
 */

import { supabaseAuthRepository } from './repositories/supabase/supabaseAuthRepository';
import { supabaseProfileRepository } from './repositories/supabase/supabaseProfileRepository';
import { supabaseTripRepository } from './repositories/supabase/supabaseTripRepository';
import { supabaseActivityRepository } from './repositories/supabase/supabaseActivityRepository';
import { supabaseRevisionRepository } from './repositories/supabase/supabaseRevisionRepository';
import { supabaseTemplateRepository } from './repositories/supabase/supabaseTemplateRepository';

import { inMemoryAuthRepository } from './repositories/inMemoryAuthRepository';
import { profileRepository as inMemoryProfileRepository } from './repositories/profileRepository';
import { tripRepository as inMemoryTripRepository } from './repositories/tripRepository';
import { activityRepository as inMemoryActivityRepository } from './repositories/activityRepository';
import { revisionRepository as inMemoryRevisionRepository } from './repositories/revisionRepository';
import { templateRepository as inMemoryTemplateRepository } from './repositories/templateRepository';

const hasSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const authRepository = hasSupabase ? supabaseAuthRepository : inMemoryAuthRepository;
export const profileRepository = hasSupabase ? supabaseProfileRepository : inMemoryProfileRepository;
export const tripRepository = hasSupabase ? supabaseTripRepository : inMemoryTripRepository;
export const activityRepository = hasSupabase ? supabaseActivityRepository : inMemoryActivityRepository;
export const revisionRepository = hasSupabase ? supabaseRevisionRepository : inMemoryRevisionRepository;
export const templateRepository = hasSupabase ? supabaseTemplateRepository : inMemoryTemplateRepository;

// Re-export interfaces so callers can type-annotate without reaching into impl files
export type { IAuthRepository, SignUpInput, SignInInput, AuthStateChangeCallback } from './repositories/authRepository';
export type { IProfileRepository, Profile, CreateProfileInput, UpdateProfileInput, TripPreferenceTags } from './repositories/profileRepository';
export type { ITripRepository, CreateTripInput, UpdateTripInput } from './repositories/tripRepository';
export type { IActivityRepository, ActivityInput, ReorderInput } from './repositories/activityRepository';
export type { IRevisionRepository, Revision, RevisionStatus, CreateRevisionInput } from './repositories/revisionRepository';
export type { ITemplateRepository, TripTemplateSummary } from './repositories/templateRepository';

// Re-export error primitives so hooks can handle failures consistently
export type { Result, DatabaseError, DatabaseErrorCode } from './databaseErrors';
export { ok, err, notFound, conflict, validationError, unauthorized, forbidden, internal } from './databaseErrors';
