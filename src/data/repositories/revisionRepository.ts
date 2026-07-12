/**
 * revisionRepository.ts
 *
 * Manages AI revision records. Each revision captures the user's prompt, the
 * AI's proposed changes, and whether those changes were accepted or rejected.
 * The in-memory implementation stores revisions in the shared MemoryStore.
 *
 * When wired to Supabase, replace InMemoryRevisionRepository with a
 * SupabaseRevisionRepository that queries `public.ai_revisions`.
 */

import type { AIRevision } from '../../types';
import type { Result } from '../databaseErrors';
import { ok, notFound } from '../databaseErrors';
import { store, generateId } from '../memoryStore';

// ─── Application model (extends base AIRevision with status) ─────────────────

export type RevisionStatus = 'pending' | 'accepted' | 'rejected';

export interface Revision {
  id: string;
  tripId: string;
  prompt: string;
  summary: string;
  status: RevisionStatus;
  createdAt: string;
  appliedAt: string | null;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateRevisionInput {
  tripId: string;
  prompt: string;
  summary: string;
}

// ─── Interface ────────────────────────────────────────────────────────────────

export interface IRevisionRepository {
  /** Persists a new AI revision record in pending status. */
  createRevision(input: CreateRevisionInput): Promise<Result<Revision>>;

  /** Returns a single revision by ID. */
  getRevision(id: string): Promise<Result<Revision>>;

  /**
   * Marks a revision as accepted and records the applied timestamp.
   * The caller is responsible for applying the actual changes to the trip.
   */
  acceptRevision(id: string): Promise<Result<Revision>>;

  /** Marks a revision as rejected. */
  rejectRevision(id: string): Promise<Result<Revision>>;
}

// ─── In-memory store for revisions ───────────────────────────────────────────

const revisions: Revision[] = [];

// ─── In-memory implementation ─────────────────────────────────────────────────

class InMemoryRevisionRepository implements IRevisionRepository {
  async createRevision(input: CreateRevisionInput): Promise<Result<Revision>> {
    const revision: Revision = {
      id: generateId(),
      tripId: input.tripId,
      prompt: input.prompt,
      summary: input.summary,
      status: 'pending',
      createdAt: new Date().toISOString(),
      appliedAt: null,
    };
    revisions.push(revision);
    // Also persist to the shared store for cross-module access
    store.revisions.push({
      id: revision.id,
      tripId: revision.tripId,
      prompt: revision.prompt,
      summary: revision.summary,
      createdAt: revision.createdAt,
    } satisfies AIRevision);
    return ok(revision);
  }

  async getRevision(id: string): Promise<Result<Revision>> {
    const revision = revisions.find((r) => r.id === id);
    if (!revision) return { ok: false, error: notFound('revision', id) };
    return ok(revision);
  }

  async acceptRevision(id: string): Promise<Result<Revision>> {
    const idx = revisions.findIndex((r) => r.id === id);
    if (idx < 0) return { ok: false, error: notFound('revision', id) };
    revisions[idx] = { ...revisions[idx], status: 'accepted', appliedAt: new Date().toISOString() };
    return ok(revisions[idx]);
  }

  async rejectRevision(id: string): Promise<Result<Revision>> {
    const idx = revisions.findIndex((r) => r.id === id);
    if (idx < 0) return { ok: false, error: notFound('revision', id) };
    revisions[idx] = { ...revisions[idx], status: 'rejected' };
    return ok(revisions[idx]);
  }
}

export const revisionRepository: IRevisionRepository = new InMemoryRevisionRepository();
