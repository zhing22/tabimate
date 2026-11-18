import type { KAPLAYCtx } from 'kaplay';
import { describe, expect, it, vi } from 'vitest';
import { LEVELS, type LevelId } from '@/config/tiers';
import { createEffectsLayer, type Decorated } from './effectsLayer';
import { createParticles, createTwinkle } from './particles';
import { EFFECTS } from './registry';

/** Just enough Kaplay for effects: an update loop we step by hand, and draw counters. */
function fakeKaplay() {
  const updates = new Set<() => void>();
  const drawRect = vi.fn();
  const drawCircle = vi.fn();
  const k = {
    onUpdate: (fn: () => void) => {
      updates.add(fn);
      return { cancel: () => updates.delete(fn) };
    },
    dt: () => 1 / 60,
    rgb: () => ({}),
    vec2: (x: number, y: number) => ({ x, y }),
    drawRect,
    drawCircle,
  } as unknown as KAPLAYCtx;
  const step = (frames = 1) => {
    for (let i = 0; i < frames; i++) for (const fn of [...updates]) fn();
  };
  return { k, step, drawRect, updates };
}

const follower = (level: LevelId): Decorated => ({
  level,
  target: { x: 100, y: 150, size: 24, glow: 0 },
});

// A fixed sequence, so tests don't depend on Math.random.
const steady = () => {
  let i = 0;
  return () => ((i = (i * 7 + 3) % 10), i / 10);
};

describe('particles', () => {
  it('move, fall, fade out and free their slot', () => {
    const p = createParticles(4, 10);
    p.spawn(0, 0, 10, -10, 1, 2);
    expect(p.alive).toBe(1);
    p.update(0.5);
    const seen: number[][] = [];
    p.forEach((x, y, alpha, colour) => seen.push([x, y, alpha, colour]));
    expect(seen).toEqual([[5, -2.5, 0.5, 2]]); // vy: -10 + 10 x 0.5 = -5; y: -5 x 0.5
    p.update(0.6);
    expect(p.alive).toBe(0);
  });

  it('reuse the oldest slot when full, never growing', () => {
    const p = createParticles(2, 0);
    for (let i = 0; i < 5; i++) p.spawn(i, 0, 0, 0, 1, 0);
    expect(p.alive).toBe(2);
    const xs: number[] = [];
    p.forEach((x) => xs.push(x));
    expect(xs.sort()).toEqual([3, 4]);
  });

  it('twinkle rises and falls over its duration', () => {
    const t = createTwinkle(1);
    expect(t.active).toBe(false);
    t.start(2, -5);
    t.update(0.5);
    expect(t.strength).toBeCloseTo(1);
    t.update(0.5);
    expect(t.active).toBe(false);
  });
});

describe('effects registry', () => {
  it('has an effect for every effectId in LEVELS', () => {
    for (const level of LEVELS) expect(typeof EFFECTS[level.effectId]).toBe('function');
  });
});

describe('effects layer', () => {
  it('starts one effect per follower and stops those that are gone', () => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    const baseline = f.updates.size; // the shake updater
    const a = follower(4);
    const b = follower(2);
    layer.sync([a, b], true);
    expect(f.updates.size).toBe(baseline + 2);
    layer.sync([a, b], false); // already running: nothing new
    expect(f.updates.size).toBe(baseline + 2);
    layer.sync([b], false); // a was dropped (a restore)
    expect(f.updates.size).toBe(baseline + 1);
    layer.dispose();
    expect(f.updates.size).toBe(0);
  });

  it('bursts sparks for a level 4 entrance, but not when rebuilding the party', () => {
    const sparksDrawn = (burst: boolean) => {
      const f = fakeKaplay();
      const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
      layer.sync([follower(4)], burst);
      f.step();
      f.drawRect.mockClear();
      layer.drawFront();
      return f.drawRect.mock.calls.length;
    };
    expect(sparksDrawn(true)).toBeGreaterThan(5);
    expect(sparksDrawn(false)).toBe(0);
  });

  it('shakes the scene for a shiny entrance, then settles', () => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    layer.sync([follower(5)], true);
    let moved = false;
    for (let i = 0; i < 10; i++) {
      f.step();
      if (layer.offset.x !== 0 || layer.offset.y !== 0) moved = true;
    }
    expect(moved).toBe(true);
    f.step(60); // well past the shake
    expect(layer.offset).toEqual({ x: 0, y: 0 });
  });

  it('gives a shiny follower a glow that stays as it walks', () => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    const shiny = follower(5);
    layer.sync([shiny], false);
    f.step(120);
    expect(shiny.target.glow).toBeGreaterThan(0.2);
  });

  describe('with reduced motion', () => {
    it('never shakes, and a shiny entrance has no sparks, only a glow', () => {
      const f = fakeKaplay();
      const layer = createEffectsLayer(f.k, { reducedMotion: true, random: steady() });
      const shiny = follower(5);
      layer.sync([shiny], true);
      for (let i = 0; i < 20; i++) {
        f.step();
        expect(layer.offset).toEqual({ x: 0, y: 0 });
      }
      f.drawRect.mockClear();
      layer.drawFront();
      expect(f.drawRect).not.toHaveBeenCalled();
      expect(shiny.target.glow).toBeGreaterThan(0.5);
    });

    it('swaps the level 4 burst for a fading glow', () => {
      const f = fakeKaplay();
      const layer = createEffectsLayer(f.k, { reducedMotion: true, random: steady() });
      const sparkly = follower(4);
      layer.sync([sparkly], true);
      f.step();
      expect(sparkly.target.glow).toBeGreaterThan(0.9);
      f.drawRect.mockClear();
      layer.drawFront();
      expect(f.drawRect).not.toHaveBeenCalled();
      f.step(60);
      expect(sparkly.target.glow).toBe(0);
    });
  });
});

describe('glint', () => {
  const drawnAfter = (frames: number, burst: boolean, reducedMotion = false) => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion, random: steady() });
    layer.sync([follower(2)], burst);
    f.step(frames);
    f.drawRect.mockClear();
    layer.drawFront();
    return f.drawRect.mock.calls;
  };

  it('flashes a star as the animal joins, and nothing when rebuilding', () => {
    expect(drawnAfter(10, true).length).toBe(5); // centre + 4 arms
    expect(drawnAfter(10, false)).toHaveLength(0);
  });

  it('twinkles now and then afterwards', () => {
    let seen = 0;
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    layer.sync([follower(3)], false);
    for (let i = 0; i < 60 * 8; i++) {
      f.step();
      f.drawRect.mockClear();
      layer.drawFront();
      if (f.drawRect.mock.calls.length > 0) seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('with reduced motion, fades a fixed-size star instead of growing it', () => {
    const calls = drawnAfter(10, true, true);
    const sizes = calls.map(([opt]) => (opt as { width: number; height: number }).width);
    expect(Math.max(...sizes)).toBe(1); // arms stay one pixel
  });
});

describe('effects layer: stopping', () => {
  it('dispose stops every effect, its drawing and the shake', () => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    layer.sync([follower(5), follower(4), follower(2)], true);
    f.step();
    layer.dispose();
    expect(f.updates.size).toBe(0);
    f.drawRect.mockClear();
    layer.drawFront();
    expect(f.drawRect).not.toHaveBeenCalled();
  });

  it('a restore in the middle of a shake leaves the scene still', () => {
    const f = fakeKaplay();
    const layer = createEffectsLayer(f.k, { reducedMotion: false, random: steady() });
    layer.sync([follower(5)], true);
    f.step(3); // shaking
    layer.sync([follower(1)], false); // the run is rebuilt from a save
    expect(layer.offset).toEqual({ x: 0, y: 0 });
    f.step();
    expect(layer.offset).toEqual({ x: 0, y: 0 });
  });
});
