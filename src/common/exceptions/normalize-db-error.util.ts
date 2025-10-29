// src/common/exceptions/normalize-db-error.util.ts
export type NormalizedDbErrorType =
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'not_null_violation'
  | 'check_violation'
  | 'syntax_error'
  | 'connection_error'
  | 'unknown';

export interface NormalizedDbError {
  type: NormalizedDbErrorType;
  message: string;
  code?: string;
  detail?: string;
  constraint?: string;
}

/**
 * Narrow shape for objects that may carry DB error info.
 */
interface MaybeDbError {
  code?: string;
  message?: string;
  detail?: string;
  constraint?: string;
  cause?: unknown;
  originalError?: unknown;
  [k: string]: unknown;
}

/**
 * Walk through nested wrappers (cause, originalError, error, response, meta) to find the
 * deepest object that looks like a DB error.
 */
function unwrapError(err: unknown): MaybeDbError | undefined {
  const visited = new Set<unknown>();
  let current: unknown = err;

  // Keys we want to follow recursively (in order of likelihood)
  const unwrapKeys = [
    'cause',
    'originalError',
    'error',
    'response',
    'meta',
  ] as const;

  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    const candidate = current as Record<string, unknown>;

    // Detect likely DB error by presence of code/message
    if (
      'code' in candidate ||
      ('message' in candidate &&
        typeof candidate.message === 'string' &&
        /constraint|duplicate|unique|foreign/i.test(candidate.message))
    ) {
      return candidate as MaybeDbError;
    }

    // Try to unwrap one of the known keys
    const next = unwrapKeys
      .map((key) => candidate[key])
      .find((v): v is object => typeof v === 'object' && v !== null);

    if (next) current = next;
    else break;
  }

  if (typeof err === 'object' && err !== null) {
    return err as MaybeDbError;
  }

  return undefined;
}

/**
 * Normalize raw DB driver/ORM errors into a consistent shape.
 */
export function normalizeDbError(error: unknown): NormalizedDbError {
  const found = unwrapError(error);

  if (!found) {
    return { type: 'unknown', message: 'Unknown database error' };
  }

  const code = String(found.code ?? '').trim();
  const message = (found.message ?? String(found)).toString();
  const detail = (found.detail ?? undefined) as string | undefined;
  const constraint = (found.constraint ?? undefined) as string | undefined;

  // PostgreSQL numeric codes
  if (
    code === '23505' ||
    /unique_violation/i.test(message) ||
    /duplicate key/i.test(message) ||
    /duplicate entry/i.test(message)
  ) {
    return {
      type: 'unique_violation',
      message,
      code,
      detail,
      constraint,
    };
  }

  if (
    code === '23503' ||
    /foreign key/i.test(message) ||
    /referenced/gi.test(message)
  ) {
    return {
      type: 'foreign_key_violation',
      message,
      code,
      detail,
      constraint,
    };
  }

  if (code === '23502' || /not null/i.test(message)) {
    return {
      type: 'not_null_violation',
      message,
      code,
      detail,
      constraint,
    };
  }

  if (code === '23514' || /check constraint/i.test(message)) {
    return {
      type: 'check_violation',
      message,
      code,
      detail,
      constraint,
    };
  }

  // MySQL numeric codes or text
  if (
    code === '1062' ||
    /ER_DUP_ENTRY/i.test(code) ||
    /duplicate entry/i.test(message)
  ) {
    return {
      type: 'unique_violation',
      message,
      code,
      detail,
      constraint,
    };
  }

  // SQLite textual checks
  if (/UNIQUE constraint failed/i.test(message)) {
    return {
      type: 'unique_violation',
      message,
      detail,
    };
  }

  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return {
      type: 'foreign_key_violation',
      message,
      detail,
    };
  }

  if (/NOT NULL constraint failed/i.test(message)) {
    return {
      type: 'not_null_violation',
      message,
      detail,
    };
  }

  // fallback
  return {
    type: 'unknown',
    message,
    code: code || undefined,
    detail,
    constraint,
  };
}
