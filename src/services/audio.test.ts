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
  const events = new EventTarget();
  // How many resume() calls to ignore before one works (a tap the browser won't count).
  const refusals = { left: 0 };
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
      if (refusals.left > 0) refusals.left--;
      else ctx.state = 'running';
      return Promise.resolve();
    }),
    /** The system suspends audio (a phone call, on iOS). */
    suspend() {
      ctx.state = 'suspended';
      events.dispatchEvent(new Event('statechange'));
    },
    addEventListener: (type: string, fn: () => void) => events.addEventListener(type, fn),
    removeEventListener: (type: string, fn: () => void) => events.removeEventListener(type, fn),
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
  return { ctx, played, refusals };
}

const result = (tier: 0 | 1 | 5, animalId: string | null = tier ? 'tiger' : null): RoundResult =>
  ({
    promptId: 'p',
    timeMs: 1,
    match: { tier, animalId, strategy: animalId ? 'exact' : null, input: '' },
  }) as RoundResult;

function setup(muted = false, createContext?: () => AudioContext) {
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
    createContext: createContext ?? (() => fake.ctx as unknown as AudioContext),
    revealTiming: { suspenseMs: 600, perTierMs: 150, badgePopMs: 0, nameDelayMs: 0 },
  });
  const unlock = async (type = 'pointerdown') => {
    unlockOn.dispatchEvent(new Event(type));
    await Promise.resolve();
    await Promise.resolve();
  };
  return { bus, storage, audio, unlock, notes, fake, now };
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

describe('createAudio: unlocking', () => {
  const miss = (t: ReturnType<typeof setup>) =>
    t.bus.emit('answerRejected', { round: 0, input: 'x' });

  it('keeps trying on later taps when the first one does not start audio (iOS)', async () => {
    const t = setup();
    t.fake.refusals.left = 1;
    await t.unlock('pointerdown'); // not counted by the browser
    miss(t);
    expect(t.notes()).toEqual([]);
    await t.unlock('touchend'); // this one is
    miss(t);
    expect(t.notes()).toEqual(SOUNDS.miss.map((n) => n.freq));
    const resumes = t.fake.ctx.resume.mock.calls.length;
    await t.unlock('click'); // running now: nothing left listening
    expect(t.fake.ctx.resume.mock.calls.length).toBe(resumes);
  });

  it('listens again when the system suspends audio, e.g. for a call', async () => {
    const t = setup();
    await t.unlock();
    t.fake.ctx.suspend();
    miss(t);
    expect(t.notes()).toEqual([]);
    await t.unlock('touchend');
    miss(t);
    expect(t.notes()).toEqual(SOUNDS.miss.map((n) => n.freq));
  });

  it('stays silent, without errors or retries, where Web Audio is missing', async () => {
    const createContext = vi.fn(() => {
      throw new Error('no AudioContext');
    });
    const t = setup(false, createContext);
    await t.unlock();
    await t.unlock('click');
    miss(t);
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(t.notes()).toEqual([]);
  });
});

describe('createAudio: the last-seconds tick', () => {
  it('only ticks for the seconds still ahead when a round starts late (a reload)', async () => {
    const t = setup();
    await t.unlock();
    t.now.ms = 22_000; // 3 s left: ticks at 22, 23 and 24 s, not 20 and 21
    t.bus.emit('roundStarted', { index: 0, prompt: PROMPT, endsAt: 25_000 });
    vi.advanceTimersByTime(5_000);
    expect(t.notes().filter((f) => f === SOUNDS.tick[0]!.freq)).toHaveLength(3);
  });
});
