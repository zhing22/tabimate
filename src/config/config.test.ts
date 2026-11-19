import { describe, expect, it } from 'vitest';
import { BIOMES } from './biomes';
import {
  LAUNCH_DATE_KEY,
  MATCHER_CONFIG,
  MAX_PROMPTS_PER_PUZZLE,
  PROMPTS_PER_DAY,
  RESET_HOUR,
  REVEAL_TIMING,
  revealBuildUpMs,
  ROUND_TIME_MS,
  TIMER_WARN_MS,
} from './game';
import { DEFAULT_MAX_CR, maxCRFor, themeFor, weekdayOf } from './themes';
import { ANSWER_LEVELS, isLevelId, isShiny, LEVELS, TOP_LEVEL } from './levels';

// Later steps index and search these arrays; these invariants keep that safe.
describe('config invariants', () => {
  it('builds up longer for rarer levels, without dragging', () => {
    const steps = [0, 1, 2, 3, 4, 5].map((level) => revealBuildUpMs(level));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(steps[5]).toBeGreaterThan(steps[1]!);
    expect(steps[5]! + REVEAL_TIMING.nameDelayMs).toBeLessThanOrEqual(2_500);
    expect(REVEAL_TIMING.badgePopMs).toBeGreaterThan(0);
  });

  it('the timer warns only near the end of a round', () => {
    expect(TIMER_WARN_MS).toBeGreaterThan(0);
    expect(TIMER_WARN_MS).toBeLessThan(ROUND_TIME_MS);
  });

  it('LEVELS is indexed by level id', () => {
    expect(LEVELS).toHaveLength(6);
    LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index);
      expect(level.colour).toBe(`--level-${index}`);
    });
  });

  it('level points rise with rarity, and a miss scores nothing', () => {
    expect(LEVELS[0].points).toBe(0);
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i]?.points).toBeGreaterThan(LEVELS[i - 1]?.points ?? Infinity);
    }
  });

  it('biomes start at 0 with strictly rising thresholds and unique ids', () => {
    expect(BIOMES[0].minScore).toBe(0);
    for (let i = 1; i < BIOMES.length; i++) {
      expect(BIOMES[i]?.minScore).toBeGreaterThan(BIOMES[i - 1]?.minScore ?? Infinity);
    }
    expect(new Set(BIOMES.map((b) => b.id)).size).toBe(BIOMES.length);
  });

  it('biome palette colours are 6-digit hex', () => {
    for (const biome of BIOMES) {
      for (const colour of Object.values(biome.palette)) {
        expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('game and matcher settings are in sensible ranges', () => {
    expect(Number.isInteger(RESET_HOUR) && RESET_HOUR >= 0 && RESET_HOUR <= 23).toBe(true);
    expect(LAUNCH_DATE_KEY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PROMPTS_PER_DAY).toBeGreaterThan(0);
    expect(PROMPTS_PER_DAY).toBeLessThanOrEqual(MAX_PROMPTS_PER_PUZZLE);
    expect(ROUND_TIME_MS).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.minSimilarity).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.minSimilarity).toBeLessThanOrEqual(1);
    expect(MATCHER_CONFIG.looseMinInnerGrams).toBeGreaterThanOrEqual(1);
    expect(MATCHER_CONFIG.typoMaxDistance).toBeGreaterThanOrEqual(1);
    expect(MATCHER_CONFIG.typoMinLength).toBeGreaterThanOrEqual(1);
    expect(MATCHER_CONFIG.typoMaxShare).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.typoMaxShare).toBeLessThanOrEqual(1);
    expect(MATCHER_CONFIG.partialMinLength).toBeGreaterThanOrEqual(1);
    expect(MATCHER_CONFIG.partialMinCoverage).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.partialMinCoverage).toBeLessThanOrEqual(1);
  });
});

// Derived from LEVELS; isLevelId also guards loading saved runs.
describe('level helpers', () => {
  it('ANSWER_LEVELS is every level but the miss, lowest first; TOP_LEVEL is the last', () => {
    expect(ANSWER_LEVELS).toEqual([1, 2, 3, 4, 5]);
    expect(TOP_LEVEL).toBe(5);
    expect(TOP_LEVEL).toBe(LEVELS[LEVELS.length - 1]!.id);
  });

  it.each([0, 1, 2, 3, 4, 5])('isLevelId(%j) is true', (value) => {
    expect(isLevelId(value)).toBe(true);
  });

  it.each([6, -1, 1.5, '1', null, undefined, Number.NaN, {}])('isLevelId(%j) is false', (value) => {
    expect(isLevelId(value)).toBe(false);
  });

  it('isShiny is true only for the level whose effect is shiny', () => {
    const shiny = LEVELS.filter((l) => l.effectId === 'shiny').map((l) => l.id);
    expect(shiny).toEqual([5]);
    for (const { id } of LEVELS) expect(isShiny(id)).toBe(id === 5);
  });
});

describe('themes', () => {
  const sunday = { id: 'deep-dive', name: 'Deep Dive', weekday: 0 as const, maxCR: 3 };
  it('reads the weekday from the key, not the clock', () => {
    expect(weekdayOf('2026-11-22')).toBe(0); // a Sunday
    expect(weekdayOf('2026-11-19')).toBe(4); // a Thursday
  });

  it('finds a weekday theme and its maxCR, defaulting to one CR', () => {
    expect(themeFor('2026-11-22', [sunday])).toBe(sunday);
    expect(maxCRFor('2026-11-22', [sunday])).toBe(3);
    expect(themeFor('2026-11-19', [sunday])).toBeNull();
    expect(maxCRFor('2026-11-19', [sunday])).toBe(DEFAULT_MAX_CR);
    expect(maxCRFor('2026-11-22', [{ ...sunday, maxCR: undefined } as never])).toBe(1);
  });
});
