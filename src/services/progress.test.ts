import { describe, expect, it } from 'vitest';
import { dailyKey } from '@/core/date';
import { createBus, type GameEvents } from '@/core/events';
import { createRunState } from '@/core/game';
import { createGameController } from '@/core/gameController';
import { ANIMALS, PROMPT } from '@/core/matcher/testFixtures';
import type { StorageAdapter } from '@/core/storage';
import { createFakeTime } from '@/core/testFakes';
import type { DateKey, Puzzle } from '@/core/types';
import { createProgressService } from './progress';
import { BACKUP_KEY, SAVE_KEY, SCHEMA_VERSION } from './saveData';
import { createMemoryStorageAdapter } from './storage';
import { finishedRun, playingRun } from './testRuns';

const puzzleFor = (date: DateKey): Puzzle => ({
  date,
  number: 1,
  prompts: ['r1', 'r2', 'r3'].map((id) => ({ ...PROMPT, id })),
});

/**
 * One page load: a controller wired to progress the way main.ts will be.
 * Noon SGT is 04:00 UTC, so '2026-11-07T05:00:00Z' plays the 7 Nov puzzle.
 */
function openPage(storage: StorageAdapter, iso: string) {
  const time = createFakeTime(iso);
  const progress = createProgressService(storage, time.clock);
  const key = dailyKey(time.clock.now());
  const bus = createBus<GameEvents>();
  const game = createGameController({
    puzzle: puzzleFor(key),
    animals: ANIMALS,
    bus,
    clock: time.clock,
    scheduler: time.scheduler,
  });
  bus.on('stateChanged', ({ state }) => progress.saveRun(state));
  bus.on('runFinished', () => progress.completeRun(game.getState(), ANIMALS));
  const saved = progress.loadToday(key);
  const restored = saved !== null && game.restore(saved);
  if (!restored) game.start();
  return { time, progress, game, key, restored };
}

/** Answers every remaining round of the page's run and lets it finish. */
function finish(page: ReturnType<typeof openPage>) {
  while (page.game.getState().status !== 'finished') {
    page.game.submit('Platypus');
    page.game.next();
  }
}

describe('progress: resume', () => {
  it('a refresh carries on from the same round with the same deadline', () => {
    const storage = createMemoryStorageAdapter();
    const first = openPage(storage, '2026-11-07T05:00:00Z');
    first.game.submit('Platypus');
    first.game.next();
    const before = first.game.getState();

    const again = openPage(storage, '2026-11-07T05:00:05Z');
    expect(again.restored).toBe(true);
    expect(again.game.getState()).toEqual(before);
    again.game.submit('tiger');
    expect(again.game.getState().results.map((r) => r.match.animalId)).toEqual([
      'platypus',
      'tiger',
    ]);
  });

  it('a refresh after the round ran out records the timeout', () => {
    const storage = createMemoryStorageAdapter();
    openPage(storage, '2026-11-07T05:00:00Z');
    const later = openPage(storage, '2026-11-07T05:10:00Z');
    expect(later.game.getState().results[0]?.match.level).toBe(0);
  });
});

describe('progress: one run per day', () => {
  it('reopening after finishing shows the result and cannot start again', () => {
    const storage = createMemoryStorageAdapter();
    finish(openPage(storage, '2026-11-07T05:00:00Z'));

    const again = openPage(storage, '2026-11-07T09:00:00Z');
    expect(again.restored).toBe(true);
    expect(again.game.getState().status).toBe('finished');
    again.game.start();
    again.game.submit('tiger');
    expect(again.game.getState().results.map((r) => r.match.animalId)).toEqual([
      'platypus',
      'platypus',
      'platypus',
    ]);
    // The re-announced finish did not count the day twice.
    expect(again.progress.getStats()).toMatchObject({ streak: 1, history: [{ score: 75 }] });
  });

  it('refuses to overwrite a finished run, or roll back one in progress', () => {
    const progress = createProgressService(createMemoryStorageAdapter(), createFakeTime().clock);
    const fresh = createRunState(puzzleFor('2026-11-07'));
    expect(progress.saveRun(playingRun('2026-11-07'))).toBe(true);
    expect(progress.saveRun(fresh)).toBe(false);
    expect(progress.completeRun(finishedRun('2026-11-07'), ANIMALS)).not.toBeNull();
    expect(progress.saveRun(fresh)).toBe(false);
    expect(progress.loadToday('2026-11-07')?.status).toBe('finished');
  });
});

describe('progress: streaks', () => {
  it('grows by 1 for a run on the next day', () => {
    const storage = createMemoryStorageAdapter();
    finish(openPage(storage, '2026-11-07T05:00:00Z'));
    const next = openPage(storage, '2026-11-08T05:00:00Z');
    finish(next);
    expect(next.progress.getStats()).toMatchObject({
      streak: 2,
      bestStreak: 2,
      lastPlayedKey: '2026-11-08',
    });
  });

  it('counts the noon reset, not midnight, as the day boundary', () => {
    const storage = createMemoryStorageAdapter();
    finish(openPage(storage, '2026-11-07T05:00:00Z')); // 7 Nov puzzle, 13:00 SGT
    // 8 Nov 02:00 SGT is still the 7 Nov puzzle: already played.
    const night = openPage(storage, '2026-11-07T18:00:00Z');
    expect(night.key).toBe('2026-11-07');
    expect(night.game.getState().status).toBe('finished');
  });

  it('resets to 1 after a missed day, and reads 0 until then', () => {
    const storage = createMemoryStorageAdapter();
    finish(openPage(storage, '2026-11-07T05:00:00Z'));
    finish(openPage(storage, '2026-11-08T05:00:00Z'));

    const skipped = openPage(storage, '2026-11-10T05:00:00Z'); // 9 Nov missed
    expect(skipped.progress.getStats().streak).toBe(0);
    finish(skipped);
    expect(skipped.progress.getStats()).toMatchObject({ streak: 1, bestStreak: 2 });
  });
});

describe('progress: storage', () => {
  it('keeps full runs for RUNS_KEPT_DAYS but history for every day', () => {
    const storage = createMemoryStorageAdapter();
    const progress = createProgressService(storage, createFakeTime().clock);
    const days = Array.from({ length: 10 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    for (const day of days) progress.completeRun(finishedRun(day), ANIMALS);
    expect(progress.loadToday('2026-11-03')).toBeNull();
    expect(progress.loadToday('2026-11-04')?.status).toBe('finished');
    expect(progress.getStats().history).toHaveLength(10);
  });

  it('does not overwrite a save written by a newer version', () => {
    const storage = createMemoryStorageAdapter();
    const future = { version: SCHEMA_VERSION + 1, somethingNew: true };
    storage.set(SAVE_KEY, future);
    const progress = createProgressService(storage, createFakeTime().clock);
    progress.saveRun(playingRun('2026-11-07'));
    expect(storage.get(SAVE_KEY)).toEqual(future);
  });

  it('starts empty when nothing is saved', () => {
    const progress = createProgressService(createMemoryStorageAdapter(), createFakeTime().clock);
    expect(progress.loadToday('2026-11-07')).toBeNull();
    expect(progress.getStats()).toEqual({
      streak: 0,
      bestStreak: 0,
      lastPlayedKey: null,
      history: [],
      freezes: 0,
      frozenKeys: [],
    });
  });
});

describe('progress: two tabs', () => {
  it('a second tab cannot replace an answer the first tab already saved', () => {
    const storage = createMemoryStorageAdapter();
    const a = openPage(storage, '2026-11-07T05:00:00Z');
    a.game.submit('Platypus');
    a.game.next(); // round 2 in progress, saved

    // Tab B opens the same moment and restores the same round.
    const b = openPage(storage, '2026-11-07T05:00:00Z');
    expect(b.restored).toBe(true);

    a.game.submit('red fox'); // a poor answer in tab A...
    a.game.next();
    b.game.submit('snow leopard'); // ...retried in tab B
    b.game.next();

    // Both tabs have reached the same point; storage keeps the answer saved first.
    expect(b.game.getState().results[1]?.match.animalId).toBe('snow-leopard');
    const reloaded = openPage(storage, '2026-11-07T05:00:01Z');
    expect(reloaded.game.getState().results.map((r) => r.match.input)).toEqual([
      'Platypus',
      'red fox',
    ]);
  });

  it('two tabs left open do not fight: the stale one stops saving', () => {
    const storage = createMemoryStorageAdapter();
    const a = openPage(storage, '2026-11-07T05:00:00Z');
    const b = openPage(storage, '2026-11-07T05:00:00Z');
    finish(a);
    finish(b);
    const reloaded = openPage(storage, '2026-11-07T06:00:00Z');
    expect(reloaded.game.getState().results).toEqual(a.game.getState().results);
    expect(reloaded.progress.getStats().history).toHaveLength(1);
  });
});

describe('progress: damaged saves', () => {
  const entry = (key: string) => ({ key, score: 25, levels: [2, 0, 0] });
  const damaged = {
    version: SCHEMA_VERSION,
    runs: {},
    stats: {
      streak: 2,
      bestStreak: 2,
      lastPlayedKey: '2026-11-08',
      history: [entry('2026-11-07'), { key: 'oops' }, entry('2026-11-08')],
    },
  };

  it('one bad history entry costs that entry, not the streak', () => {
    const storage = createMemoryStorageAdapter();
    storage.set(SAVE_KEY, damaged);
    const page = openPage(storage, '2026-11-09T05:00:00Z');
    finish(page);
    expect(page.progress.getStats()).toMatchObject({ streak: 3, bestStreak: 3 });
    expect(page.progress.getStats().history.map((h) => h.key)).toEqual([
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
    ]);
  });

  it('backs up what it could not read before writing over it', () => {
    const storage = createMemoryStorageAdapter();
    storage.set(SAVE_KEY, damaged);
    openPage(storage, '2026-11-09T05:00:00Z'); // starting the run saves
    expect(storage.get(BACKUP_KEY)).toEqual(damaged);
    expect(storage.get(SAVE_KEY)).not.toEqual(damaged);
  });

  it('backs up a save that cannot be read at all', () => {
    const storage = createMemoryStorageAdapter();
    storage.set(SAVE_KEY, '{truncated');
    openPage(storage, '2026-11-09T05:00:00Z');
    expect(storage.get(BACKUP_KEY)).toBe('{truncated');
  });

  it('leaves no backup when the save was fine', () => {
    const storage = createMemoryStorageAdapter();
    finish(openPage(storage, '2026-11-07T05:00:00Z'));
    finish(openPage(storage, '2026-11-08T05:00:00Z'));
    expect(storage.get(BACKUP_KEY)).toBeNull();
  });
});

describe('progress: the Field Journal and achievements', () => {
  it('adds a finished run to the journal once, and keeps it across a reload', () => {
    const storage = createMemoryStorageAdapter();
    const progress = createProgressService(storage, createFakeTime().clock);
    const collected = progress.completeRun(finishedRun('2026-11-07'), ANIMALS);
    expect(collected?.newlyFound).toEqual(['platypus']);
    // The same finish again (a reload on the results screen) adds nothing.
    expect(progress.completeRun(finishedRun('2026-11-07'), ANIMALS)).toBeNull();
    const reloaded = createProgressService(storage, createFakeTime().clock).getCollection();
    expect(reloaded.journal.platypus).toMatchObject({ timesFound: 1, bestLevel: 2 });
  });

  it('saves the achievements a run unlocks, with the day that unlocked them', () => {
    const storage = createMemoryStorageAdapter();
    const progress = createProgressService(storage, createFakeTime().clock);
    for (const day of ['2026-11-07', '2026-11-08', '2026-11-09']) {
      progress.completeRun(finishedRun(day), ANIMALS);
    }
    const { achievements } = createProgressService(storage, createFakeTime().clock).getCollection();
    expect(achievements).toContainEqual({ id: 'streak-3', unlockedKey: '2026-11-09' });
  });

  it('does not collect a run that is not finished', () => {
    const progress = createProgressService(createMemoryStorageAdapter(), createFakeTime().clock);
    expect(progress.completeRun(playingRun('2026-11-07'), ANIMALS)).toBeNull();
    expect(progress.getCollection().journal).toEqual({});
  });
});

describe('progress: streak freezes across SGT days', () => {
  // Noon SGT is 04:00 UTC: 05:00Z plays that date's puzzle, 03:00Z still the day before.
  const at = (day: number, hourUtc = 5) =>
    `2026-11-${String(day).padStart(2, '0')}T0${hourUtc}:00:00Z`;

  it('a week of play earns a freeze that covers one missed SGT day', () => {
    const storage = createMemoryStorageAdapter();
    for (let day = 1; day <= 7; day++) finish(openPage(storage, at(day)));
    // 8 Nov's puzzle is missed. On 9 Nov at 03:00Z (11:00 SGT) it is still 8 Nov's puzzle.
    expect(openPage(storage, at(9, 3)).progress.streakStatus()).toEqual({
      streak: 7,
      savedByFreeze: false,
    });
    // After noon SGT on 9 Nov: one day missed, the freeze holds the streak.
    const page = openPage(storage, at(9));
    expect(page.progress.streakStatus()).toEqual({ streak: 7, savedByFreeze: true });
    finish(page);
    expect(page.progress.getStats()).toMatchObject({ streak: 8, freezes: 0 });
    expect(page.progress.getStats().frozenKeys).toEqual(['2026-11-08']);
  });
});
