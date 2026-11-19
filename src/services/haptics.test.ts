import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REVEAL_TIMING, revealBuildUpMs } from '@/config/game';
import { LEVELS, type AnswerLevel } from '@/config/levels';
import { createBus, type GameEvents } from '@/core/events';
import { MUTED_KEY } from './audio';
import { createHaptics } from './haptics';
import { createMemoryStorageAdapter } from './storage';

const matched = (level: AnswerLevel | 0) => ({
  round: 0,
  result: {
    promptId: 'p',
    timeMs: 1,
    match:
      level === 0
        ? ({ level, animalId: null, strategy: null, input: '' } as const)
        : ({ level, animalId: 'x', strategy: 'exact', input: 'x' } as const),
  },
});

describe('createHaptics', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (nav: { vibrate?: (p: number[]) => boolean } = { vibrate: vi.fn(() => true) }) => {
    const bus = createBus<GameEvents>();
    const storage = createMemoryStorageAdapter();
    const haptics = createHaptics({ bus, storage, navigator: nav });
    return { bus, storage, haptics, nav };
  };

  it("buzzes the level's pattern as its badge lands", () => {
    const { bus, nav } = setup();
    bus.emit('answerMatched', matched(5));
    vi.advanceTimersByTime(revealBuildUpMs(5, REVEAL_TIMING) - 1);
    expect(nav.vibrate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(nav.vibrate).toHaveBeenCalledWith([...LEVELS[5].vibration]);
  });

  it('is stronger for rarer levels', () => {
    const total = (level: AnswerLevel) => LEVELS[level].vibration.reduce((a, b) => a + b, 0);
    for (let level = 1; level < 5; level++) {
      expect(total((level + 1) as AnswerLevel)).toBeGreaterThan(total(level as AnswerLevel));
    }
  });

  it('stays still while muted (the same switch as the sound)', () => {
    const { bus, storage, nav } = setup();
    storage.set(MUTED_KEY, true);
    bus.emit('answerMatched', matched(3));
    vi.runAllTimers();
    expect(nav.vibrate).not.toHaveBeenCalled();
  });

  it('does nothing where vibration is not supported, or throws', () => {
    const { bus } = setup({});
    expect(() => {
      bus.emit('answerMatched', matched(2));
      vi.runAllTimers();
    }).not.toThrow();
    const throwing = setup({
      vibrate: () => {
        throw new Error('no gesture yet');
      },
    });
    throwing.bus.emit('answerMatched', matched(2));
    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('stops listening and cancels pending buzzes when disposed', () => {
    const { bus, haptics, nav } = setup();
    bus.emit('answerMatched', matched(4));
    haptics.dispose();
    vi.runAllTimers();
    bus.emit('answerMatched', matched(4));
    vi.runAllTimers();
    expect(nav.vibrate).not.toHaveBeenCalled();
  });
});
