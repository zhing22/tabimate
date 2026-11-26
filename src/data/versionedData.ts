// Versioned data files (config/data.ts VERSIONED_DATA_FILES): the build wraps
// each as { dataVersion, data } (scripts/lib/buildAssets.ts wrapVersioned);
// the loader unwraps them and checks a set came from one build. Pure.
import { DATA_VERSION_KEY } from '@/config/data';

/** A loaded file: its payload, and the build's version (null for a plain file, as in dev). */
export interface Versioned {
  readonly version: string | null;
  readonly data: unknown;
}

/** Unwraps { dataVersion, data }; anything else is a plain file with no version. */
export function unwrapVersioned(json: unknown): Versioned {
  if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
    const record = json as Record<string, unknown>;
    const version = record[DATA_VERSION_KEY];
    if (typeof version === 'string' && 'data' in record) return { version, data: record['data'] };
  }
  return { version: null, data: json };
}

/**
 * Whether files loaded together are one build's: every version the same.
 * All plain (dev, tests) counts as one; plain mixed with versioned does not.
 */
export function sameVersion(entries: readonly Versioned[]): boolean {
  return new Set(entries.map((e) => e.version)).size <= 1;
}
