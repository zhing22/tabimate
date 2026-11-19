// Reading and writing the data files the content scripts touch, formatted the
// way the repo's prettier config formats them, so diffs show only real changes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { format, resolveConfig } from 'prettier';

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export async function writeJson(path: string, data: unknown): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  const options = (await resolveConfig(path)) ?? {};
  writeFileSync(path, await format(JSON.stringify(data), { ...options, filepath: path }));
}
