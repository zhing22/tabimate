import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBus, type GameEvents } from '@/core/events';
import type { RoundResult } from '@/core/types';
import { PROMPT } from '@/core/matcher/testFixtures';
import { createAudio, MUTED_KEY } from './audio';
import { SOUNDS, tierSound } from './sounds';
import { createMemoryStorageAdapter } from './storage';

/** Records the notes played, as frequencies, instead of making sound. */
function fakeContext() {
  const played: number[] = [];
  const param = () => ({
    setValueAtTime: vi.fn((v: number) => played.push(v)),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      ctx.state = 'running';
      return Promise.resolve();
    }),
    close: vi.fn(() => Promise.resolve()),
    createGain: () => ({ gain: param(), connect: (to: unknown) => to }),
    createOscillator: () => {
      const frequency = param();
      return {
        type: 'sine',
        frequency,
        connect: (to: unknown) => to,
        start: vi.fn(),
        stop: vi.fn(),
      };
    },
  };
  return { ctx, played };
}

const result = (tier: 0 | 1 | 5, animalId: string | null = tier ? 'tiger' : null): RoundResult =>
  ({
    promptId: 'p',
    timeMs: 1,
    match: { tier, animalId, strategy: animalId ? 'exact' : null, input: '' },
  }) as RoundResult;

function setup(muted = false) {
  const bus = createBus<GameEvents>();
  const storage = createMemoryStorageAdapter();
  if (muted) storage.set(MUTED_KEY, true);
  const unlockOn = new EventTarget();
  const fake = fakeContext();
  // Only the oscillator's start frequencies are counted (gains are tiny numbers).
  const notes = () => fake.played.filter((v) => v >= 100);
  const now = { ms: 0 };
  const audio = createAudio({
    bus,
    storage,
    unlockOn,
    clock: { now: () => new Date(now.ms) },
    createContext: () => fake.ctx as unknown as AudioContext,
    revealTiming: { suspenseMs: 600, perTierMs: 150, badgePopMs: 0, nameDelayMs: 0 },
  });
  const unlock = async () => {
    unlockOn.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
  };
  return { bus, storage, audio, unlock, notes, fake };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createAudio', () => {
  it('stays silent until the first tap or key press unlocks audio', async () => {
    const t = setup();
    t.bus.emit('answerRejected', { round: 0, input: 'x' });
    expect(t.notes()).toEqual([]);
    await t.unlock();
    t.bus.emit('answerRejected', { round: 0, input: 'x' });
    expect(t.notes()).toEqual(SOUNDS.miss.map((n) => n.freq));
  });

  it("plays a tier's sound as its badge pops, after the same drum-roll as the UI", async () => {
    const t = setup();
    await t.unlock();
    t.bus.emit('answerMatched', { round: 0, result: result(5) });
    vi.advanceTimersByTime(600 + 5 * 150 - 1);
    expect(t.notes()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(t.notes()).toEqual(SOUNDS.tier5.map((n) => n.freq));
  });

  it('plays the join sound when a follower joins, not after a miss', async () => {
    const t = setup();
    await t.unlock();
    t.bus.emit('answerMatched', { round: 0, result: result(0) });
    vi.runAllTimers();
    const before = t.notes().length;
    t.bus.emit('revealFinished', { index: 0 });
    expect(t.notes()).toHaveLength(before);
    t.bus.emit('answerMatched', { round: 1, result: result(1) });
    t.bus.emit('revealFinished', { index: 1 });
    expect(t.notes().slice(-1)).toEqual([SOUNDS.join[0]!.freq]);
  });

  it('ticks through the last seconds of a round, and stops when answered', async () => {
    const t = setup();
    await t.unlock();
    t.bus.emit('roundStarted', { index: 0, prompt: PROMPT, endsAt: 25_000 });
    vi.advanceTimersByTime(21_000); // ticks at 20, 21 s so far
    expect(t.notes().filter((f) => f === SOUNDS.tick[0]!.freq)).toHaveLength(2);
    t.bus.emit('answerMatched', { round: 0, result: result(1) });
    vi.advanceTimersByTime(10_000);
    expect(t.notes().filter((f) => f === SOUNDS.tick[0]!.freq)).toHaveLength(2);
  });

  it('stays quiet when muted, and remembers it', async () => {
    const t = setup();
    await t.unlock();
    t.audio.setMuted(true);
    expect(t.storage.get(MUTED_KEY)).toBe(true);
    t.bus.emit('answerSuggested', { round: 0, input: 'orca', suggestion: 'Killer whale' });
    expect(t.notes()).toEqual([]);

    const again = setup(true);
    expect(again.audio.muted).toBe(true);
  });

  it('cancels pending sounds on dispose', async () => {
    const t = setup();
    await t.unlock();
    t.bus.emit('answerMatched', { round: 0, result: result(5) });
    t.audio.dispose();
    vi.runAllTimers();
    expect(t.notes()).toEqual([]);
    expect(t.fake.ctx.close).toHaveBeenCalled();
  });
});

describe('sounds', () => {
  it('gives every tier its own sound, grander as it gets rarer', () => {
    const tiers = [0, 1, 2, 3, 4, 5].map((tier) => SOUNDS[tierSound(tier)]);
    const signatures = tiers.map((notes) => notes.map((n) => `${n.freq}@${n.at}`).join());
    expect(new Set(signatures).size).toBe(6);
    for (let i = 2; i <= 5; i++) expect(tiers[i]!.length).toBeGreaterThan(tiers[i - 1]!.length);
  });

  it('keeps every note audible and short', () => {
    for (const notes of Object.values(SOUNDS)) {
      for (const n of notes) {
        expect(n.freq).toBeGreaterThan(20);
        expect(n.gain).toBeGreaterThan(0);
        expect(n.gain).toBeLessThanOrEqual(1);
        expect(n.at + n.dur).toBeLessThan(1.5);
      }
    }
  });
});
