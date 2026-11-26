import { describe, expect, it } from 'vitest';
import { sameVersion, unwrapVersioned } from '@/data/versionedData';
import {
  contentHash,
  hashedName,
  HASHED_SPRITE,
  hashedSpriteManifest,
  setVersion,
  wrapVersioned,
} from './buildAssets';

describe('build asset helpers', () => {
  it('hashes content into the name, before the extension', () => {
    const hash = contentHash('abc');
    expect(hash).toMatch(/^[0-9a-f]{10}$/);
    expect(contentHash('abc')).toBe(hash);
    expect(contentHash('abd')).not.toBe(hash);
    expect(hashedName('bear.png', hash)).toBe(`bear.${hash}.png`);
    expect(HASHED_SPRITE.test(`bear.${hash}.png`)).toBe(true);
    expect(HASHED_SPRITE.test('bear.png')).toBe(false);
    expect(HASHED_SPRITE.test('manifest.json')).toBe(false);
  });

  it('maps each archetype to its hashed image and JSON', () => {
    const manifest = hashedSpriteManifest(['bear'], 'assets/sprites', (file) =>
      file.endsWith('.png') ? '1111111111' : '2222222222',
    );
    expect(manifest).toEqual({
      bear: {
        image: 'assets/sprites/bear.1111111111.png',
        json: 'assets/sprites/bear.2222222222.json',
      },
    });
  });

  it('gives a set one version that changes when any file does', () => {
    expect(setVersion(['a', 'b'])).toBe(setVersion(['a', 'b']));
    expect(setVersion(['a', 'b'])).not.toBe(setVersion(['a', 'c']));
    expect(setVersion(['ab', ''])).not.toBe(setVersion(['a', 'b']));
  });
});

describe('versioned data files', () => {
  it('unwraps what the build wraps; plain files have no version', () => {
    const wrapped: unknown = JSON.parse(JSON.stringify(wrapVersioned('v1', [1, 2])));
    expect(unwrapVersioned(wrapped)).toEqual({ version: 'v1', data: [1, 2] });
    expect(unwrapVersioned([1, 2])).toEqual({ version: null, data: [1, 2] });
    expect(unwrapVersioned({ a: 1 })).toEqual({ version: null, data: { a: 1 } });
  });

  it('calls a set one build only when every version matches', () => {
    const v = (version: string | null) => ({ version, data: null });
    expect(sameVersion([v('a'), v('a')])).toBe(true);
    expect(sameVersion([v(null), v(null)])).toBe(true);
    expect(sameVersion([v('a'), v('b')])).toBe(false);
    expect(sameVersion([v('a'), v(null)])).toBe(false);
  });
});
