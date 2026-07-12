/**
 * src/data/index.ts
 *
 * Single import point for all repository implementations.
 * All application code (hooks, components) must import from here — never
 * directly from an individual repository file or from supabase-js.
 */

export { supabaseAuthRepository as authRepository } from './repositories/supabase/supabaseAuthRepository';
export { supabaseProfileRepository as profileRepository } from './repositories/supabase/supabaseProfileRepository';
export { supabaseTripRepository as tripRepository } from './repositories/supabase/supabaseTripRepository';
export { supabaseActivityRepository as activityRepository } from './repositories/supabase/supabaseActivityRepository';
export { supabaseRevisionRepository as revisionRepository } from './repositories/supabase/supabaseRevisionRepository';

// Re-export interfaces so callers can type-annotate without reaching into impl files
export type { IAuthRepository, SignUpInput, SignInInput, AuthStateChangeCallback } from './repositories/authRepository';
export type { IProfileRepository, Profile, CreateProfileInput, UpdateProfileInput } from './repositories/profileRepository';
export type { ITripRepository, CreateTripInput, UpdateTripInput } from './repositories/tripRepository';
export type { IActivityRepository, ActivityInput, ReorderInput } from './repositories/activityRepository';
export type { IRevisionRepository, Revision, RevisionStatus, CreateRevisionInput } from './repositories/revisionRepository';

// Re-export error primitives so hooks can handle failures consistently
export type { Result, DatabaseError, DatabaseErrorCode } from './databaseErrors';
export { ok, err, notFound, conflict, validationError, unauthorized, forbidden, internal } from './databaseErrors';
