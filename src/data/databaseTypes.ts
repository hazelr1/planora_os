/**
 * databaseTypes.ts
 *
 * Raw database row types using snake_case field names to match the future
 * PostgreSQL / Supabase schema. Repository implementations map between these
 * types and the camelCase application models defined in src/types.ts.
 *
 * When the Supabase repository is wired in, every Supabase query will return
 * rows that match these interfaces exactly (before mapping).
 */

// ─── auth.users (managed by Supabase Auth) ───────────────────────────────────

export interface DbUser {
  id: string;               // uuid primary key
  email: string;
  created_at: string;       // iso timestamp
}

// ─── public.profiles ─────────────────────────────────────────────────────────

export interface DbProfile {
  id: string;               // uuid primary key (= auth.users.id)
  user_id: string;          // fk → auth.users.id
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── public.trips ────────────────────────────────────────────────────────────

export interface DbTrip {
  id: string;               // uuid primary key
  user_id: string | null;   // fk → auth.users.id  (nullable before auth is wired)
  title: string;
  destination: string;
  start_date: string;       // date string YYYY-MM-DD
  end_date: string;         // date string YYYY-MM-DD
  budget: number;
  currency: string;         // ISO 4217 (USD, EUR …)
  travelers: number;
  pace: string;             // 'Relaxed' | 'Balanced' | 'Packed'
  interests: string[];      // stored as text[] in postgres
  special_requests: string;
  status: string;           // 'Planning' | 'Confirmed' | 'Completed'
  last_updated: string;     // iso timestamp
  created_at: string;       // iso timestamp
}

// ─── public.trip_days ────────────────────────────────────────────────────────

export interface DbTripDay {
  id: string;               // uuid primary key
  trip_id: string;          // fk → trips.id
  label: string;            // 'Day 1', 'Day 2' …
  date: string;             // YYYY-MM-DD
  theme: string;
  summary: string;
  day_number: number;       // 1-based sort index within the trip
}

// ─── public.activities ───────────────────────────────────────────────────────

export interface DbActivity {
  id: string;               // uuid primary key
  trip_day_id: string;      // fk → trip_days.id
  trip_id: string;          // fk → trips.id  (denormalized for convenience)
  title: string;
  description: string;
  time: string;             // HH:MM (24h)
  location: string;
  duration_minutes: number; // minutes
  estimated_cost: number;
  currency: string;
  category: string;
  ai_reason: string;
  is_locked: boolean;
  personal_note: string;    // JSON-encoded Note[]
  sort_order: number;       // position within the day; lower = earlier
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  cost_confidence: 'low' | 'medium' | 'high';
  updated_at: string;
}

// ─── public.activity_notes ───────────────────────────────────────────────────

export interface DbActivityNote {
  id: string;               // uuid primary key
  activity_id: string;      // fk → activities.id
  text: string;
  created_at: string;
}

// ─── public.ai_revisions ─────────────────────────────────────────────────────

export interface DbAIRevision {
  id: string;               // uuid primary key
  trip_id: string;          // fk → trips.id
  prompt: string;
  summary: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  applied_at: string | null;
}
