import { describe, expect, it, vi } from 'vitest';
import { GROUND_Y, WALK_SPEED } from '@/config/render';
import { createTrail, movementFor, type Point } from './followerTrail';
import { createIdleMotion, SQUASH_MIN, type Pose } from './idleMotion';
import { createPlayer } from './player';

const point = (): Point => ({ x: 0, y: 0 });
const pose = (): Pose => ({ dy: 0, scaleY: 1, angle: 0 });

describe('createTrail', () => {
  it('starts as a straight line behind the player', () => {
    const trail = createTrail(64);
    trail.reset(100, GROUND_Y);
    expect(trail.pointBehind(19, point())).toEqual({ x: 81, y: GROUND_Y });
    expect(trail.pointBehind(0, point())).toEqual({ x: 100, y: GROUND_Y });
  });

  it('keeps followers on the path the player took, a fixed distance back', () => {
    const trail = createTrail(64);
    trail.reset(0, GROUND_Y);
    trail.record(10, GROUND_Y);
    trail.record(10, GROUND_Y - 10); // a hop straight up
    trail.record(30, GROUND_Y - 10);
    // 20 px back along the path is the top of the hop, not 20 px left of the player.
    expect(trail.pointBehind(20, point())).toEqual({ x: 10, y: GROUND_Y - 10 });
    expect(trail.pointBehind(25, point())).toEqual({ x: 10, y: GROUND_Y - 5 });
  });

  it('ignores moves under a pixel until they add up', () => {
    const trail = createTrail(16);
    trail.reset(0, GROUND_Y);
    trail.record(0.4, GROUND_Y);
    trail.record(0.8, GROUND_Y);
    expect(trail.pointBehind(0, point()).x).toBe(0);
    trail.record(1.2, GROUND_Y);
    expect(trail.pointBehind(0, point()).x).toBe(1);
    trail.record(2, GROUND_Y);
    expect(trail.pointBehind(0, point()).x).toBe(2);
  });

  it('clamps to the oldest sample it kept', () => {
    const trail = createTrail(8);
    trail.reset(0, GROUND_Y);
    trail.record(100, GROUND_Y);
    expect(trail.pointBehind(1_000, point()).x).toBe(93);
  });

  it('walks every movement it does not know yet on the path', () => {
    const out = movementFor('sky')({ x: 5, y: GROUND_Y }, 0, 0, point());
    expect(out).toEqual({ x: 5, y: GROUND_Y });
  });
});

describe('createIdleMotion', () => {
  it('bobs by whole pixels, breathes between SQUASH_MIN and 1, and wobbles slightly', () => {
    const motion = createIdleMotion({ seed: 'tiger', reducedMotion: false });
    const p = pose();
    const seen = { dy: new Set<number>(), minScale: 1, maxAngle: 0 };
    for (let i = 0; i < 600; i++) {
      motion.update(1 / 60, p);
      seen.dy.add(p.dy);
      seen.minScale = Math.min(seen.minScale, p.scaleY);
      seen.maxAngle = Math.max(seen.maxAngle, Math.abs(p.angle));
      expect(p.scaleY).toBeLessThanOrEqual(1);
    }
    expect([...seen.dy].every(Number.isInteger)).toBe(true);
    expect(seen.dy.size).toBeGreaterThan(1);
    expect(seen.minScale).toBeCloseTo(SQUASH_MIN, 2);
    expect(seen.maxAngle).toBeGreaterThan(0.02);
    expect(seen.maxAngle).toBeLessThan(0.05);
  });

  it('only bobs when reduced motion is asked for', () => {
    const motion = createIdleMotion({ seed: 'tiger', reducedMotion: true });
    const p = pose();
    for (let i = 0; i < 300; i++) {
      motion.update(1 / 60, p);
      expect(p.scaleY).toBe(1);
      expect(p.angle).toBe(0);
    }
  });

  it('gives each character its own phase', () => {
    const a = createIdleMotion({ seed: 'tiger', reducedMotion: false }).update(0.5, pose());
    const b = createIdleMotion({ seed: 'koala', reducedMotion: false }).update(0.5, pose());
    expect(a).not.toEqual(b);
  });

  it('blinks every 2 to 5 seconds', () => {
    const onBlink = vi.fn();
    const motion = createIdleMotion({ seed: 'tiger', reducedMotion: false, onBlink });
    for (let i = 0; i < 60 * 20; i++) motion.update(1 / 60, pose());
    expect(onBlink.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(onBlink.mock.calls.length).toBeLessThanOrEqual(10);
  });
});

describe('createPlayer', () => {
  it('walks the distance at about WALK_SPEED, easing in and out', () => {
    const player = createPlayer();
    player.walkBy(96);
    expect(player.walking).toBe(true);
    player.update(0.1);
    const early = player.x;
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.1 * WALK_SPEED); // slow start
    for (let i = 0; i < 200; i++) player.update(1 / 60);
    expect(player.x).toBe(96);
    expect(player.walking).toBe(false);
  });

  it('takes at least half a second for a short walk', () => {
    const player = createPlayer();
    player.walkBy(8);
    player.update(0.4);
    expect(player.walking).toBe(true);
    player.update(0.1);
    expect(player.x).toBe(8);
  });

  it('adds a walk to one in progress, and can be placed at once', () => {
    const player = createPlayer();
    player.walkBy(50);
    player.update(0.3);
    player.walkBy(50);
    for (let i = 0; i < 300; i++) player.update(1 / 60);
    expect(player.x).toBe(100);
    player.placeAt(250);
    expect(player.x).toBe(250);
    expect(player.walking).toBe(false);
  });
});
