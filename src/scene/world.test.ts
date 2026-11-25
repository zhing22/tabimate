import { describe, expect, it } from 'vitest';
import { BIOME_BORDER, FOLLOWER_SPACING, FOOTPRINT_STEP, TITLE_CARD } from '@/config/render';
import type { AnswerLevel } from '@/config/levels';
import { distanceFor } from '@/core/journey';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { RoundResult } from '@/core/types';
import { type Point } from './entities/followerTrail';
import { dominantBiome, gatewayX } from './strip';
import { createWorld, type World } from './world';

const hit = (animalId: string, level: AnswerLevel): RoundResult => ({
  promptId: 'p',
  timeMs: 1,
  match: { level, animalId, strategy: 'exact', input: animalId },
});
const miss: RoundResult = {
  promptId: 'p',
  timeMs: 1,
  match: { level: 0, animalId: null, strategy: null, input: 'zzz' },
};

const world = (reducedMotion = false) => createWorld({ animals: ANIMALS, reducedMotion });
const settle = (w: World, seconds = 10) => {
  for (let i = 0; i < seconds * 60; i++) w.update(1 / 60);
};

describe('world: a run', () => {
  it('adds the animal as it joins, then walks its distance', () => {
    const w = world();
    w.join(hit('tiger', 4)); // 85 points
    expect(w.followers).toHaveLength(1);
    expect(w.followers[0]?.pop).toBe(0);
    expect(w.player.walking).toBe(true);
    settle(w);
    expect(w.player.x).toBe(distanceFor(85));
    expect(w.followers[0]?.pop).toBe(1);
  });

  it('marks a level 5 animal shiny', () => {
    const w = world();
    w.join(hit('amur-leopard', 5));
    expect(w.followers[0]?.shiny).toBe(true);
  });

  it('leaves footprints on a miss and stays put, each miss a step past the last', () => {
    const w = world();
    const prints = () => [...w.footprints].filter((x) => !Number.isNaN(x));
    w.join(miss);
    w.join(miss);
    settle(w);
    expect(w.followers).toHaveLength(0);
    expect(w.player.x).toBe(0);
    expect(prints()).toEqual([0, FOOTPRINT_STEP]);
    w.join(hit('platypus', 2)); // a hit starts the count again
    w.join(miss);
    expect(prints().at(-1)).toBe(distanceFor(25));
  });

  it('walks into the next biome through its border', () => {
    const w = world();
    expect(w.state).toMatchObject({ biome: 'town', nextBiome: 'grassland', blend: 0 });
    w.join(hit('snow-leopard', 3)); // 50: Grassland starts at 50
    let blended = false;
    for (let i = 0; i < 600; i++) {
      w.update(1 / 60);
      if (w.state.blend > 0 && w.state.blend < 1) blended = true;
    }
    expect(blended).toBe(true);
    expect(dominantBiome(w.state)).toBe('grassland');
  });

  it('three followers trail the player one spacing apart on its path', () => {
    const w = world();
    for (const [id, level] of [
      ['platypus', 2],
      ['snow-leopard', 3],
      ['tiger', 4],
    ] as const) {
      w.join(hit(id, level));
      settle(w);
    }
    const p: Point = { x: 0, y: 0 };
    const xs = w.followers.map((_, k) => w.trail.pointBehind((k + 1) * FOLLOWER_SPACING, p).x);
    const s = FOLLOWER_SPACING;
    const end = distanceFor(160);
    expect(xs).toEqual([end - s, end - 2 * s, end - 3 * s]);
  });
});

describe('world: title cards', () => {
  it('shows the biome name as the player passes its gateway, then clears it', () => {
    const w = world();
    w.join(hit('snow-leopard', 3)); // 50: exactly into Grassland
    let shownAt = Number.NaN;
    for (let i = 0; i < 600 && Number.isNaN(shownAt); i++) {
      w.update(1 / 60);
      if (w.titleCard.biome === 'grassland') shownAt = w.player.x;
    }
    expect(shownAt).toBeGreaterThanOrEqual(gatewayX(1));
    expect(shownAt).toBeLessThan(gatewayX(1) + BIOME_BORDER / 4);
    settle(w, TITLE_CARD.totalMs / 1000 + 0.1);
    expect(w.titleCard.biome).toBeNull();
  });

  it('cuts at the border with reduced motion: no blend, still a title card', () => {
    const w = world(true);
    w.join(hit('snow-leopard', 3));
    let blended = false;
    let card = false;
    for (let i = 0; i < 60; i++) {
      w.update(1 / 60);
      // A cut: the blend is all one biome or all the other, never between.
      if (w.state.blend > 0 && w.state.blend < 1) blended = true;
      if (w.titleCard.biome === 'grassland') card = true;
    }
    expect(blended).toBe(false);
    expect(card).toBe(true);
    expect(dominantBiome(w.state)).toBe('grassland');
  });
});

describe('world: blinking', () => {
  it('closes a standing follower’s eyes for a moment, every few seconds', () => {
    const w = world();
    w.restore([hit('tiger', 4)]);
    let blinks = 0;
    let wasBlinking = false;
    for (let i = 0; i < 60 * 12; i++) {
      w.update(1 / 60);
      const blinking = w.followers[0]!.blink > 0;
      if (blinking && !wasBlinking) blinks++;
      wasBlinking = blinking;
    }
    expect(blinks).toBeGreaterThanOrEqual(2);
    expect(blinks).toBeLessThanOrEqual(6);
  });
});

describe('world: restore', () => {
  it('rebuilds followers, position and biome at once, without animation or a card', () => {
    const w = world();
    w.restore([hit('platypus', 2), miss, hit('snow-leopard', 3)]); // 75 points
    expect(w.followers.map((f) => [f.animal.id, f.pop])).toEqual([
      ['platypus', 1],
      ['snow-leopard', 1],
    ]);
    expect(w.player.x).toBe(distanceFor(75));
    expect(w.player.walking).toBe(false);
    expect(dominantBiome(w.state)).toBe('grassland');
    w.update(1 / 60);
    expect(w.titleCard.biome).toBeNull();
    // Followers can stand behind a player restored mid-journey.
    expect(w.trail.pointBehind(FOLLOWER_SPACING, { x: 0, y: 0 }).x).toBe(
      w.player.x - FOLLOWER_SPACING,
    );
  });

  it('starts over when restored again', () => {
    const w = world();
    w.restore([hit('tiger', 4)]);
    w.restore([]);
    expect(w.followers).toHaveLength(0);
    expect(w.player.x).toBe(0);
    expect(w.state.biome).toBe('town');
  });

  it('shows no title card once the journey is over', () => {
    const w = world();
    w.endJourney();
    w.join(hit('snow-leopard', 3)); // walks into Grassland
    for (let i = 0; i < 600; i++) {
      w.update(1 / 60);
      expect(w.titleCard.biome).toBeNull();
    }
  });
});
