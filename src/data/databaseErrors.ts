// ─── Error codes ────────────────────────────────────────────────────────────

export type DatabaseErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL';

export interface DatabaseError {
  code: DatabaseErrorCode;
  message: string;
  /** The resource type that caused the error (e.g. "trip", "activity") */
  resource?: string;
  /** The specific resource ID that caused the error, if applicable */
  resourceId?: string;
}

// ─── Result type ─────────────────────────────────────────────────────────────

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DatabaseError };

// ─── Result constructors ──────────────────────────────────────────────────────

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(error: DatabaseError): Result<never> {
  return { ok: false, error };
}

// ─── Error factory helpers ────────────────────────────────────────────────────

export function notFound(resource: string, resourceId?: string): DatabaseError {
  return {
    code: 'NOT_FOUND',
    message: resourceId
      ? `${resource} with id "${resourceId}" was not found`
      : `${resource} was not found`,
    resource,
    resourceId,
  };
}

export function conflict(resource: string, message?: string): DatabaseError {
  return {
    code: 'CONFLICT',
    message: message ?? `${resource} already exists`,
    resource,
  };
}

export function validationError(message: string, resource?: string): DatabaseError {
  return { code: 'VALIDATION', message, resource };
}

export function unauthorized(message = 'Authentication is required'): DatabaseError {
  return { code: 'UNAUTHORIZED', message };
}

export function forbidden(message = 'You do not have permission to perform this action'): DatabaseError {
  return { code: 'FORBIDDEN', message };
}

export function internal(message: string): DatabaseError {
  return { code: 'INTERNAL', message };
}
