import { supabase } from '../../../lib/supabase';
import type { Result } from '../../databaseErrors';
import { ok, notFound, internal } from '../../databaseErrors';
import type { IRevisionRepository, Revision, RevisionStatus, CreateRevisionInput } from '../revisionRepository';

interface DbRevision {
  id: string;
  trip_id: string;
  prompt: string;
  summary: string;
  before_json: unknown;
  proposed_json: unknown;
  budget_difference: number | null;
  status: string;
  created_at: string;
  decided_at: string | null;
}

function mapRow(row: DbRevision): Revision {
  return {
    id: row.id,
    tripId: row.trip_id,
    prompt: row.prompt,
    summary: row.summary,
    status: row.status as RevisionStatus,
    createdAt: row.created_at,
    appliedAt: row.decided_at ?? undefined,
  };
}

class SupabaseRevisionRepository implements IRevisionRepository {
  async createRevision(input: CreateRevisionInput): Promise<Result<Revision>> {
    const { data, error } = await supabase
      .from('ai_revisions')
      .insert({
        trip_id: input.tripId,
        prompt: input.prompt,
        summary: input.summary,
        status: 'pending',
      })
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: internal('Revision insert returned no data.') };
    return ok(mapRow(data as DbRevision));
  }

  async getRevision(id: string): Promise<Result<Revision>> {
    const { data, error } = await supabase
      .from('ai_revisions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('revision', id) };
    return ok(mapRow(data as DbRevision));
  }

  async acceptRevision(id: string): Promise<Result<Revision>> {
    const { data, error } = await supabase
      .from('ai_revisions')
      .update({ status: 'accepted', decided_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('revision', id) };
    return ok(mapRow(data as DbRevision));
  }

  async rejectRevision(id: string): Promise<Result<Revision>> {
    const { data, error } = await supabase
      .from('ai_revisions')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) return { ok: false, error: internal(error.message) };
    if (!data) return { ok: false, error: notFound('revision', id) };
    return ok(mapRow(data as DbRevision));
  }
}

export const supabaseRevisionRepository: IRevisionRepository = new SupabaseRevisionRepository();
