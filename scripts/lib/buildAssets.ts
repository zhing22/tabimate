// Pure helpers for the build's asset step (scripts/vite/buildAssets.ts):
// content-hashed sprite names and one version for the data files that must
// come from the same build.
import { createHash } from 'node:crypto';
import { DATA_VERSION_KEY } from '../../src/config/data.ts';

/** A short content hash: changes whenever the bytes do. */
export const contentHash = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex').slice(0, 10);

/** "bear.png" with hash "abc" -> "bear.abc.png". */
export function hashedName(file: string, hash: string): string {
  const dot = file.lastIndexOf('.');
  return dot < 0 ? `${file}.${hash}` : `${file.slice(0, dot)}.${hash}${file.slice(dot)}`;
}

/** Hashed names match this, so the service worker and _headers can tell them apart. */
export const HASHED_SPRITE = /\.[0-9a-f]{10}\.(png|json)$/;

/**
 * The built sprite manifest: each archetype's hashed image and JSON, paths
 * under public/ (data/spriteArtSource.ts readSheetIndex reads it).
 */
export function hashedSpriteManifest(
  archetypes: readonly string[],
  dir: string,
  hashOf: (file: string) => string,
): Record<string, { image: string; json: string }> {
  const entries = archetypes.map((name) => {
    const image = `${name}.png`;
    const json = `${name}.json`;
    return [
      name,
      {
        image: `${dir}/${hashedName(image, hashOf(image))}`,
        json: `${dir}/${hashedName(json, hashOf(json))}`,
      },
    ] as const;
  });
  return Object.fromEntries(entries);
}

/** One version for a set of files: a hash over all their contents, in order. */
export const setVersion = (contents: readonly string[]): string =>
  contentHash(contents.join('\u0000'));

/** Wraps a file's payload with its set's version (data/versionedData.ts unwraps it). */
export const wrapVersioned = (version: string, data: unknown) => ({
  [DATA_VERSION_KEY]: version,
  data,
});
