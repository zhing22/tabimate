import { describe, expect, it } from 'vitest';
import { BIOMES } from './biomes';
import { MATCHER_CONFIG, PROMPTS_PER_DAY, ROUND_TIME_MS } from './game';
import { TIERS } from './tiers';

// Later steps index and search these arrays; these invariants keep that safe.
describe('config invariants', () => {
  it('TIERS is indexed by tier id', () => {
    expect(TIERS).toHaveLength(6);
    TIERS.forEach((tier, index) => {
      expect(tier.id).toBe(index);
      expect(tier.colour).toBe(`--tier-${index}`);
    });
  });

  it('tier points rise with rarity, and a miss scores nothing', () => {
    expect(TIERS[0].points).toBe(0);
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]?.points).toBeGreaterThan(TIERS[i - 1]?.points ?? Infinity);
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
    expect(PROMPTS_PER_DAY).toBeGreaterThan(0);
    expect(ROUND_TIME_MS).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.minSimilarity).toBeGreaterThan(0);
    expect(MATCHER_CONFIG.minSimilarity).toBeLessThanOrEqual(1);
    expect(MATCHER_CONFIG.typoMaxDistance).toBeGreaterThanOrEqual(1);
    const weights = Object.values(MATCHER_CONFIG.luckyTierWeights);
    expect(weights).toHaveLength(5);
    expect(weights.every((w) => w > 0)).toBe(true);
  });
});
