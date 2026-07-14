export type TravelPace = 'Relaxed' | 'Balanced' | 'Packed';
export type TripStatus = 'Planning' | 'Confirmed' | 'Completed';
export type Interest = 'Food' | 'Culture' | 'Nature' | 'Adventure' | 'History' | 'Shopping' | 'Hidden Gems' | 'Nightlife';
export type ActivityCategory = 'Food' | 'Culture' | 'Nature' | 'Adventure' | 'History' | 'Shopping' | 'Nightlife' | 'Transport' | 'Accommodation' | 'Other';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
}

export type CostConfidence = 'low' | 'medium' | 'high';

export interface Activity {
  id: string;
  dayId: string;
  tripId: string;
  title: string;
  description: string;
  time: string;
  location: string;
  /** Duration in minutes */
  duration: number;
  cost: number;
  currency: string;
  category: ActivityCategory;
  aiReason: string;
  locked: boolean;
  notes: Note[];
  /** Best-effort coordinates for the map view. Null when not (yet) placed. */
  latitude: number | null;
  longitude: number | null;
  /** How confident the AI is in `cost` as an estimate. */
  costConfidence: CostConfidence;
  /** Last-edited timestamp, shown on the activity card. */
  updatedAt: string;
}

export interface Day {
  id: string;
  tripId: string;
  label: string;
  date: string;
  theme: string;
  summary: string;
  activities: Activity[];
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelers: number;
  pace: TravelPace;
  interests: Interest[];
  specialRequests: string;
  status: TripStatus;
  lastUpdated: string;
  isDemo: boolean;
  days: Day[];
}

export interface AIRevision {
  id: string;
  tripId: string;
  prompt: string;
  summary: string;
  createdAt: string;
}

// ─── AI Revision Proposal ────────────────────────────────────────────────────

export type RevisionOperation = 'add' | 'remove' | 'replace' | 'move' | 'update' | 'add_day' | 'remove_day';

export interface ActivitySnapshot {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  ai_reason: string;
  cost_confidence?: CostConfidence;
  latitude?: number | null;
  longitude?: number | null;
}

export interface RevisionConstraint {
  constraint: string;
  satisfied: boolean;
  explanation: string;
}

export interface RevisionChange {
  operation: RevisionOperation;
  /** ID of existing activity being modified. Empty string for 'add'/'add_day'/'remove_day'. */
  activity_id: string;
  /** Day ID where the activity currently lives. For 'remove_day', the day being removed. Empty string when not applicable. */
  source_day_id: string;
  /** Target day ID for 'add' or 'move'. Empty string when not applicable — never set for 'add_day', which always appends after the trip's current last day. */
  destination_day_id: string;
  before: ActivitySnapshot;
  after: ActivitySnapshot;
  /** 'add_day' only — the new day's theme. Empty string otherwise. */
  day_theme: string;
  /** 'add_day' only — the new day's summary. Empty string otherwise. */
  day_summary: string;
  /** 'add_day' only — the new day's starting activities. Empty array otherwise. */
  day_activities: ActivitySnapshot[];
  reason: string;
}

export interface AIRevisionProposal {
  /** DB ID of the saved ai_revisions row. Null if save failed. */
  revisionId: string | null;
  /** The original instruction the user submitted. */
  instruction: string;
  summary: string;
  constraints: RevisionConstraint[];
  changes: RevisionChange[];
  old_estimated_total: number;
  new_estimated_total: number;
  budget_difference: number;
  pace_effect: string;
  warnings: string[];
}

export type Screen =
  | { name: 'landing' }
  | { name: 'signin' }
  | { name: 'reset-password' }
  | { name: 'trips' }
  | { name: 'create' }
  | { name: 'workspace'; tripId: string };

// ─── AI Copilot (conversational assistant) ───────────────────────────────────

export type CopilotRole = 'user' | 'assistant';

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  /** Present for plain Q&A replies and for the user's own messages. */
  text?: string;
  /** Present when the assistant's reply is an itinerary-modification proposal. */
  proposal?: AIRevisionProposal;
  createdAt: string;
}

/** What the copilot backend returns for a single turn. */
export type CopilotReply =
  | { type: 'answer'; message: string }
  | ({ type: 'proposal' } & AIRevisionProposal);

// ─── Trip Intelligence (AI-estimated trip-planning context) ──────────────────

export interface PackingItem {
  label: string;
  category: string;
}

export interface TripIntelligence {
  packingChecklist: PackingItem[];
  hotelSuggestions: string[];
  restaurantSuggestions: string[];
  /** AI-estimated round-trip flight price; not a live quote. */
  estimatedFlightPrice: number | null;
  generatedAt: string;
}
