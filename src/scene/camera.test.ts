import { describe, expect, it } from 'vitest';
import { FOLLOWER_SPACING, PARTY_MIN_WIDTH, PLAYER_SIZE } from '@/config/render';
import { easeSpan, partyCameraX, partySpan } from './camera';

describe('partyCameraX', () => {
  it('centres the traveller when alone', () => {
    expect(partyCameraX(500, partySpan(0), 200)).toBe(400);
  });

  it('frames a full day of followers inside the narrowest view', () => {
    const playerX = 1000;
    const span = partySpan(7);
    const left = partyCameraX(playerX, span, PARTY_MIN_WIDTH);
    const lastFollower = playerX - 7 * FOLLOWER_SPACING;
    expect(lastFollower - left).toBeGreaterThan(0);
    expect(left + PARTY_MIN_WIDTH - (playerX + PLAYER_SIZE.width / 2)).toBeGreaterThan(0);
  });
});

describe('easeSpan', () => {
  it('eases a new follower in over time', () => {
    const next = easeSpan(0, FOLLOWER_SPACING, 0.1, false);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(FOLLOWER_SPACING);
  });

  it('cuts for a restored party or reduced motion, and settles exactly', () => {
    expect(easeSpan(0, partySpan(5), 0.016, false)).toBe(partySpan(5));
    expect(easeSpan(0, FOLLOWER_SPACING, 0.016, true)).toBe(FOLLOWER_SPACING);
    expect(easeSpan(27.8, FOLLOWER_SPACING, 0.016, false)).toBe(FOLLOWER_SPACING);
  });
});
