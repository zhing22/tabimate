// Build only (v3 Step 3), after Vite has copied public/ into dist/:
// 1. Sprite sheets get content-hashed copies (bear.<hash>.png), the plain
//    copies go, and the manifest maps each archetype to its hashed files, so
//    browsers and the service worker can keep them forever (public/_headers).
// 2. The data files that must come from one build (config/data.ts) are
//    wrapped as { dataVersion, data } with one version for the set; the
//    loader refuses a mix (data/jsonLoader.ts).
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { VERSIONED_DATA_FILES } from '../../src/config/data.ts';
import {
  contentHash,
  hashedName,
  hashedSpriteManifest,
  setVersion,
  wrapVersioned,
} from '../lib/buildAssets.ts';

const SPRITES = 'assets/sprites';
const MANIFEST = `${SPRITES}/manifest.json`;

async function hashSprites(outDir: string): Promise<void> {
  const dir = join(outDir, SPRITES);
  const archetypes = JSON.parse(await readFile(join(outDir, MANIFEST), 'utf8')) as string[];
  const hashes = new Map<string, string>();
  for (const name of archetypes) {
    for (const file of [`${name}.png`, `${name}.json`]) {
      const bytes = await readFile(join(dir, file));
      const hash = contentHash(bytes);
      hashes.set(file, hash);
      await writeFile(join(dir, hashedName(file, hash)), bytes);
      await rm(join(dir, file));
    }
  }
  const manifest = hashedSpriteManifest(archetypes, SPRITES, (file) => hashes.get(file)!);
  await writeFile(join(outDir, MANIFEST), JSON.stringify(manifest));
}

async function versionDataSet(outDir: string): Promise<string> {
  const texts = await Promise.all(
    VERSIONED_DATA_FILES.map((file) => readFile(join(outDir, file), 'utf8')),
  );
  const version = setVersion(texts);
  await Promise.all(
    VERSIONED_DATA_FILES.map((file, i) =>
      writeFile(join(outDir, file), JSON.stringify(wrapVersioned(version, JSON.parse(texts[i]!)))),
    ),
  );
  return version;
}

export function buildAssets(): Plugin {
  let outDir = 'dist';
  return {
    name: 'tabimate-build-assets',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    // Sequential, before the service worker is generated (closeBundle).
    writeBundle: {
      sequential: true,
      order: 'pre',
      async handler() {
        await hashSprites(outDir);
        const version = await versionDataSet(outDir);
        this.info(`sprites hashed; data set version ${version}`);
      },
    },
  };
}
