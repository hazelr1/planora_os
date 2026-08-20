import type { ITemplateRepository, TripTemplateSummary } from './templateRepository';
import type { Trip } from '../../types';
import type { Result } from '../databaseErrors';
import { ok, notFound, internal } from '../databaseErrors';

class InMemoryTemplateRepository implements ITemplateRepository {
  async listApprovedTemplates(limit = 15): Promise<Result<TripTemplateSummary[]>> {
    return ok([]);
  }

  async findApprovedTemplatesByDestinationNames(_names: string[]): Promise<Result<TripTemplateSummary[]>> {
    return ok([]);
  }

  async getTemplateWithDetails(_id: string): Promise<Result<Trip>> {
    return { ok: false, error: notFound('trip_template', _id) };
  }

  async cloneTemplateIntoTrip(_id: string): Promise<Result<Trip>> {
    return { ok: false, error: internal('Templates cannot be cloned in local demo mode.') };
  }
}

export const templateRepository: ITemplateRepository = new InMemoryTemplateRepository();
