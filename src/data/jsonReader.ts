import type { HexColour } from '@/config/colour';
import { DataError } from './dataError';

export type JsonObject = Readonly<Record<string, unknown>>;

const HEX = /^#[0-9a-f]{6}$/i;

/** Path of a child field: field('prompts[1]', 'text') -> 'prompts[1].text'. */
export const field = (path: string, key: string): string => (path ? `${path}.${key}` : key);

/** Path of an array item: item('prompts', 1) -> 'prompts[1]'. */
export const item = (path: string, index: number): string => `${path}[${index}]`;

const show = (value: unknown): string => JSON.stringify(value) ?? String(value);

/**
 * Type-checked reads from parsed JSON. Every failure throws a DataError naming
 * the file and the full path of the bad field.
 */
export function createJsonReader(file: string) {
  const fail = (path: string, problem: string): never => {
    throw new DataError(file, path || null, problem);
  };

  const object = (value: unknown, path: string): JsonObject =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as JsonObject)
      : fail(path, `must be an object (got ${show(value)})`);

  const array = (value: unknown, path: string): readonly unknown[] =>
    Array.isArray(value) ? value : fail(path, `must be an array (got ${show(value)})`);

  const string = (value: unknown, path: string): string =>
    typeof value === 'string' && value.trim() !== ''
      ? value
      : fail(path, `must be a non-empty string (got ${show(value)})`);

  const integer = (value: unknown, path: string): number =>
    Number.isInteger(value)
      ? (value as number)
      : fail(path, `must be an integer (got ${show(value)})`);

  const oneOf = <T>(value: unknown, options: readonly T[], path: string): T =>
    options.includes(value as T)
      ? (value as T)
      : fail(path, `must be one of ${options.map(show).join(', ')} (got ${show(value)})`);

  const hex = (value: unknown, path: string): HexColour =>
    typeof value === 'string' && HEX.test(value)
      ? (value as HexColour)
      : fail(path, `must be a #rrggbb colour (got ${show(value)})`);

  const stringArray = (value: unknown, path: string): readonly string[] =>
    array(value, path).map((entry, i) => string(entry, item(path, i)));

  return { fail, object, array, string, integer, oneOf, hex, stringArray };
}

export type JsonReader = ReturnType<typeof createJsonReader>;
