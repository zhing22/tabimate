import { describe, expect, it } from 'vitest';
import { FOLLOWER_SPACING, MISS_WALK } from '@/config/render';
import type { AnswerTierId } from '@/config/tiers';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { RoundResult } from '@/core/types';
import { type Point } from './entities/followerTrail';
import { createWorld, type World } from './world';

const hit = (animalId: string, tier: AnswerTierId): RoundResult => ({
  promptId: 'p',
  timeMs: 1,
  match: { tier, animalId, strategy: 'exact', input: animalId },
});
const miss: RoundResult = {
  promptId: 'p',
  timeMs: 1,
  match: { tier: 0, animalId: null, strategy: null, input: 'zzz' },
};

const world = () => createWorld({ animals: ANIMALS, reducedMotion: false });
const settle = (w: World, seconds = 10) => {
  for (let i = 0; i < seconds * 60; i++) w.update(1 / 60);
};

describe('world: a run', () => {
  it('adds the animal only once the reveal is done, then walks its distance', () => {
    const w = world();
    w.answered(hit('tiger', 4)); // 85 points
    expect(w.followers).toHaveLength(0);
    w.revealDone();
    expect(w.followers).toHaveLength(1);
    expect(w.followers[0]?.pop).toBe(0);
    expect(w.player.walking).toBe(true);
    settle(w);
    expect(w.player.x).toBe(85);
    expect(w.followers[0]?.pop).toBe(1);
  });

  it('marks a tier 5 animal shiny', () => {
    const w = world();
    w.answered(hit('amur-leopard', 5));
    w.revealDone();
    expect(w.followers[0]?.shiny).toBe(true);
  });

  it('leaves footprints and walks a short way on a miss', () => {
    const w = world();
    w.answered(miss);
    w.revealDone();
    settle(w);
    expect(w.followers).toHaveLength(0);
    expect(w.player.x).toBe(MISS_WALK);
    expect([...w.footprints].filter((x) => !Number.isNaN(x))).toEqual([0]);
  });

  it('ignores a second revealDone for the same answer', () => {
    const w = world();
    w.answered(hit('tiger', 4));
    w.revealDone();
    w.revealDone();
    expect(w.followers).toHaveLength(1);
  });

  it('three followers trail the player one spacing apart on its path', () => {
    const w = world();
    for (const [id, tier] of [
      ['platypus', 2],
      ['snow-leopard', 3],
      ['tiger', 4],
    ] as const) {
      w.answered(hit(id, tier));
      w.revealDone();
      settle(w);
    }
    const p: Point = { x: 0, y: 0 };
    const xs = w.followers.map((_, k) => w.trail.pointBehind((k + 1) * FOLLOWER_SPACING, p).x);
    expect(xs).toEqual([160 - 19, 160 - 38, 160 - 57]);
  });

  it('crossfades to a new biome, and ends the fade', () => {
    const w = world();
    expect(w.biome).toMatchObject({ from: null, to: 'town', progress: 1 });
    w.enterBiome('grassland');
    expect(w.biome).toMatchObject({ from: 'town', to: 'grassland', progress: 0 });
    w.update(0.6);
    expect(w.biome.progress).toBeCloseTo(0.5);
    settle(w, 1);
    expect(w.biome).toMatchObject({ from: null, to: 'grassland', progress: 1 });
    w.enterBiome('grassland'); // already there
    expect(w.biome.progress).toBe(1);
  });
});

describe('world: restore', () => {
  it('rebuilds followers, position and biome at once, without animation', () => {
    const w = world();
    w.restore([hit('platypus', 2), miss, hit('snow-leopard', 3)]); // 75 points
    expect(w.followers.map((f) => [f.animal.id, f.pop])).toEqual([
      ['platypus', 1],
      ['snow-leopard', 1],
    ]);
    expect(w.player.x).toBe(25 + MISS_WALK + 50);
    expect(w.player.walking).toBe(false);
    expect(w.biome).toMatchObject({ from: null, to: 'grassland' });
    // Followers can stand behind a player restored mid-journey.
    expect(w.trail.pointBehind(FOLLOWER_SPACING, { x: 0, y: 0 }).x).toBe(w.player.x - 19);
  });

  it('starts over when restored again', () => {
    const w = world();
    w.restore([hit('tiger', 4)]);
    w.restore([]);
    expect(w.followers).toHaveLength(0);
    expect(w.player.x).toBe(0);
    expect(w.biome.to).toBe('town');
  });
});
