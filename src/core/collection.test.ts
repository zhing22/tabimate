import { describe, expect, it } from 'vitest';
import { TOP_LEVEL } from '@/config/levels';
import { emptyCollection, collectRun } from './collection';
import { emitCollected } from './collectionEvents';
import { createBus, type GameEvents } from './events';
import { ANIMALS } from './matcher/testFixtures';
import { emptyStats, historyEntry, recordRun } from './streak';
import type { RunState } from './types';

const run: RunState = {
  mode: 'daily',
  puzzleDate: '2026-11-19',
  promptCount: 3,
  status: 'finished',
  roundEndsAt: null,
  results: [
    {
      promptId: 'a',
      timeMs: 1,
      match: { level: TOP_LEVEL, animalId: 'amur-leopard', strategy: 'exact', input: 'x' },
    },
    {
      promptId: 'b',
      timeMs: 1,
      match: { level: 1, animalId: 'penguin', strategy: 'exact', input: 'x' },
    },
    // A miss, so the day is not "every prompt answered".
    { promptId: 'c', timeMs: 1, match: { level: 0, animalId: null, strategy: null, input: '' } },
  ],
};
const stats = recordRun(emptyStats(), historyEntry(run));

describe('collectRun', () => {
  it('adds the animals, then unlocks what they earn, dated by the run', () => {
    const collected = collectRun(emptyCollection(), run, stats, ANIMALS);
    expect(collected.newlyFound).toEqual(['amur-leopard', 'penguin']);
    expect(collected.unlocked).toEqual(['first-jackpot', 'first-group']);
    expect(collected.collection.achievements).toEqual([
      { id: 'first-jackpot', unlockedKey: '2026-11-19' },
      { id: 'first-group', unlockedKey: '2026-11-19' },
    ]);
  });

  it('never unlocks the same achievement twice', () => {
    const once = collectRun(emptyCollection(), run, stats, ANIMALS).collection;
    const again = collectRun(once, { ...run, puzzleDate: '2026-11-20' }, stats, ANIMALS);
    expect(again.unlocked).toEqual([]);
    expect(again.collection.achievements).toHaveLength(2);
  });
});

describe('emitCollected', () => {
  it('emits journalUpdated, then one achievementUnlocked per new achievement', () => {
    const bus = createBus<GameEvents>();
    const seen: unknown[][] = [];
    bus.on('journalUpdated', ({ newlyFound }) => seen.push(['journal', newlyFound]));
    bus.on('achievementUnlocked', ({ achievement, unlockedKey }) =>
      seen.push(['achievement', achievement.id, unlockedKey]),
    );
    emitCollected(bus, collectRun(emptyCollection(), run, stats, ANIMALS), run.puzzleDate);
    expect(seen).toEqual([
      ['journal', ['amur-leopard', 'penguin']],
      ['achievement', 'first-jackpot', '2026-11-19'],
      ['achievement', 'first-group', '2026-11-19'],
    ]);
  });
});
