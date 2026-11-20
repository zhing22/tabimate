import { describe, expect, it } from 'vitest';
import { WATER } from '@/config/movement';
import { ANIMALS } from '@/core/matcher/testFixtures';
import type { Animal } from '@/core/types';
import { createPlayer } from './entities/player';
import { createFollower, updateFollower } from './follower';

const as = (movement: Animal['movement']): Animal => ({ ...ANIMALS.get('platypus')!, movement });
const follower = (movement: Animal['movement']) =>
  createFollower({
    animal: as(movement),
    level: 2,
    index: 0,
    animate: false,
    reducedMotion: false,
  });

describe('followers that do not walk', () => {
  it("pops a water animal's bubble in water, and forms it again on land", () => {
    const f = follower('water');
    const player = createPlayer();
    expect(f.bubble).toBe(1);
    updateFollower(f, 0, player, WATER.popMs / 2000, { inWater: true });
    expect(f.bubble).toBeCloseTo(0.5);
    updateFollower(f, 0, player, WATER.popMs / 1000, { inWater: true });
    expect(f.bubble).toBe(0);
    updateFollower(f, 0, player, WATER.popMs / 1000, { inWater: false });
    expect(f.bubble).toBe(1);
    expect(follower('land').bubble).toBe(0);
  });

  it('keeps its own clock for bobbing, and takes no steps off the ground', () => {
    const player = createPlayer();
    player.walkBy(200);
    player.update(0.1);
    const bird = follower('sky');
    const walker = follower('land');
    for (let i = 0; i < 30; i++) {
      updateFollower(bird, 0, player, 1 / 60, { inWater: false });
      updateFollower(walker, 0, player, 1 / 60, { inWater: false });
    }
    expect(bird.motionS).toBeCloseTo(0.5);
    expect(walker.pose.dy).toBeLessThanOrEqual(0); // stepping bounces
    expect(bird.pose.angle).not.toBe(0); // idle sway, not the upright step pose
  });
});
