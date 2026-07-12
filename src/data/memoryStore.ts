/**
 * memoryStore.ts  (internal — do not import from UI components)
 *
 * Single source of truth for the in-memory repository implementations.
 * All in-memory repositories read and write through this shared store.
 * When the Supabase repository layer is wired in, this file is no longer used.
 *
 * Note: starts with an empty store. Sample data lives in src/lib/testFixtures.ts
 * and should only be used in tests or development seeding scripts.
 */

import type { AIRevision, Trip } from '../types';
import type { Profile } from './repositories/profileRepository';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Generates a UUID-like string compatible with future UUIDs. */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface MemoryStore {
  trips: Trip[];
  profiles: Profile[];
  revisions: AIRevision[];
  currentUserId: string | null;
}

export const store: MemoryStore = {
  trips: [],
  profiles: [],
  revisions: [],
  currentUserId: null,
};

/** Seed the store with test data. Call only from tests or dev scripts. */
export function seedStore(trips: Trip[]): void {
  store.trips = deepClone(trips);
}

