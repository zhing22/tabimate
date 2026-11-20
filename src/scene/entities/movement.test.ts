import { describe, expect, it } from 'vitest';
import { MOVEMENTS } from '@/config/animals';
import { SKY, WATER } from '@/config/movement';
import { GROUND_Y } from '@/config/render';
import { createPlacement, MOVEMENT_STRATEGIES, movementFor, type MovementInput } from './movement';

const onPath = { x: 40, y: GROUND_Y };
const input = (over: Partial<MovementInput> = {}): MovementInput => ({
  timeS: 0,
  phase: 0,
  inWater: false,
  reducedMotion: false,
  ...over,
});
const place = (kind: (typeof MOVEMENTS)[number], over: Partial<MovementInput> = {}) =>
  movementFor(kind)(onPath, input(over), createPlacement());

describe('movement strategies', () => {
  it('has one for every movement an animal can have', () => {
    expect(Object.keys(MOVEMENT_STRATEGIES).sort()).toEqual([...MOVEMENTS].sort());
  });

  it('walks land animals on the trail', () => {
    expect(place('land')).toEqual({ x: 40, y: GROUND_Y, shadow: false, anim: 'walk' });
  });

  it('hovers sky animals above the trail, bobbing, with a shadow and wing frames', () => {
    const ys = new Set<number>();
    for (let t = 0; t < 2; t += 0.05) ys.add(place('sky', { timeS: t }).y);
    expect(Math.max(...ys)).toBeLessThanOrEqual(GROUND_Y - SKY.hoverPx + SKY.bobPx);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(GROUND_Y - SKY.hoverPx - SKY.bobPx);
    expect(ys.size).toBeGreaterThan(1);
    expect(place('sky')).toMatchObject({ x: 40, shadow: true, anim: 'flap' });
  });

  it('holds still with reduced motion', () => {
    const ys = new Set([0, 0.3, 0.7].map((t) => place('sky', { timeS: t, reducedMotion: true }).y));
    expect([...ys]).toEqual([GROUND_Y - SKY.hoverPx]);
  });

  it('floats water animals in their bubble on land, and swims them in water', () => {
    const land = place('water', { reducedMotion: true });
    expect(land).toMatchObject({ y: GROUND_Y - WATER.bubbleLiftPx, anim: 'walk', shadow: false });
    const swim = place('water', { reducedMotion: true, inWater: true });
    expect(swim).toMatchObject({ y: GROUND_Y + WATER.swimSinkPx, anim: 'swim' });
  });
});
