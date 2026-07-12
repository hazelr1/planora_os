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

export type RevisionOperation = 'add' | 'remove' | 'replace' | 'move' | 'update';

export interface ActivitySnapshot {
  title: string;
  description: string;
  location: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost: number;
  category: string;
  ai_reason: string;
}

export interface RevisionConstraint {
  constraint: string;
  satisfied: boolean;
  explanation: string;
}

export interface RevisionChange {
  operation: RevisionOperation;
  /** ID of existing activity being modified. Empty string for 'add'. */
  activity_id: string;
  /** Day ID where the activity currently lives. Empty string when not applicable. */
  source_day_id: string;
  /** Target day ID for 'add' or 'move'. Empty string when not applicable. */
  destination_day_id: string;
  before: ActivitySnapshot;
  after: ActivitySnapshot;
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
  | { name: 'trips' }
  | { name: 'create' }
  | { name: 'workspace'; tripId: string };
