import { describe, expect, it } from 'vitest';
import { ROUND_TIME_MS } from '@/config/game';
import { createBus, type GameEvents } from './events';
import { createGameController } from './gameController';
import { ANIMALS, PROMPT } from './matcher/testFixtures';
import { createFakeTime } from './testFakes';
import type { Puzzle, RunState } from './types';

// Three prompts sharing the fixture answers: platypus 2, snow leopard 3, tiger 4, ...
const puzzle: Puzzle = {
  date: '2026-11-07',
  number: 2,
  prompts: ['r1', 'r2', 'r3'].map((id) => ({ ...PROMPT, id, text: `Prompt ${id}` })),
};

type Logged = { [K in keyof GameEvents]: [K, GameEvents[K]] }[keyof GameEvents];

function setup() {
  const time = createFakeTime();
  const bus = createBus<GameEvents>();
  const log: Logged[] = [];
  const names = Object.keys({
    runStarted: 0,
    runRestored: 0,
    roundStarted: 0,
    answerMatched: 0,
    answerRejected: 0,
    answerSuggested: 0,
    revealFinished: 0,
    biomeEntered: 0,
    runFinished: 0,
    stateChanged: 0,
  } satisfies Record<keyof GameEvents, 0>) as (keyof GameEvents)[];
  for (const name of names) bus.on(name, (payload) => log.push([name, payload] as Logged));
  const game = createGameController({
    puzzle,
    animals: ANIMALS,
    bus,
    clock: time.clock,
    scheduler: time.scheduler,
  });
  // Events without stateChanged, which fires after every transition.
  const story = () =>
    log
      .filter(([name]) => name !== 'stateChanged')
      .map(([name, p]) => {
        if (name === 'roundStarted') return `roundStarted ${p.index}`;
        if (name === 'answerMatched') return `answerMatched ${p.round} tier ${p.result.match.tier}`;
        if (name === 'answerRejected') return `answerRejected ${p.input}`;
        if (name === 'answerSuggested') return `answerSuggested ${p.input} -> ${p.suggestion}`;
        if (name === 'revealFinished') return `revealFinished ${p.index}`;
        if (name === 'biomeEntered') return `biomeEntered ${p.biome.id}`;
        if (name === 'runFinished') return `runFinished ${p.score}`;
        return name;
      });
  return { time, bus, log, game, story };
}

describe('gameController: a full run', () => {
  it('plays 3 prompts with a fake clock and emits events in order', () => {
    const { time, game, story, log } = setup();
    game.start();
    time.advance(3_000);
    game.submit('Platypus'); // tier 2: 25 points
    game.next();
    time.advance(4_000);
    game.submit('snow leopard'); // tier 3: 75, enters Grassland at 50
    game.next();
    game.submit('tiger'); // tier 4: 160, enters Forest at 125
    game.next();

    expect(story()).toEqual([
      'runStarted',
      'roundStarted 0',
      'answerMatched 0 tier 2',
      'revealFinished 0',
      'roundStarted 1',
      'answerMatched 1 tier 3',
      'revealFinished 1',
      'biomeEntered grassland',
      'roundStarted 2',
      'answerMatched 2 tier 4',
      'revealFinished 2',
      'biomeEntered forest',
      'runFinished 160',
    ]);

    const state = game.getState();
    expect(state.status).toBe('finished');
    expect(state.results.map((r) => [r.promptId, r.match.animalId, r.timeMs])).toEqual([
      ['r1', 'platypus', 3_000],
      ['r2', 'snow-leopard', 4_000],
      ['r3', 'tiger', 0],
    ]);
    // Every transition is announced: start, then submit + revealDone per round.
    expect(log.filter(([name]) => name === 'stateChanged')).toHaveLength(7);
    expect(time.pending()).toBe(0);
  });

  it('gives roundStarted an endsAt from the injected clock', () => {
    const { time, game, log } = setup();
    game.start();
    const started = log.find(([name]) => name === 'roundStarted');
    expect(started?.[1]).toMatchObject({ index: 0, endsAt: time.nowMs() + ROUND_TIME_MS });
  });
});

describe('gameController: timers', () => {
  it('scores a timeout as an empty miss and moves on', () => {
    const { time, game, story } = setup();
    game.start();
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results[0]).toEqual({
      promptId: 'r1',
      timeMs: ROUND_TIME_MS,
      match: { tier: 0, animalId: null, strategy: null, input: '' },
    });
    game.next();
    expect(story()).toEqual([
      'runStarted',
      'roundStarted 0',
      'answerMatched 0 tier 0',
      'revealFinished 0',
      'roundStarted 1',
    ]);
  });

  it('clears the round timer when an answer comes in', () => {
    const { time, game } = setup();
    game.start();
    game.submit('Platypus');
    // Round 1's timer would have fired by now; round 2's has not started (the
    // reveal is still up). So any second result here would be a stray timeout.
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results).toHaveLength(1);
    expect(game.getState().status).toBe('revealing');
    expect(time.pending()).toBe(0);
  });

  it('ignores submits while revealing, before start and after the run', () => {
    const { time, game } = setup();
    game.submit('Platypus');
    expect(game.getState().status).toBe('idle');
    game.start();
    game.submit('Platypus');
    game.submit('tiger');
    expect(game.getState().results).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      time.advance(ROUND_TIME_MS);
      game.next();
    }
    expect(game.getState().status).toBe('finished');
    game.submit('tiger');
    expect(game.getState().results).toHaveLength(3);
  });

  it('waits on the reveal until next(), with no clock running', () => {
    const { time, game, story } = setup();
    game.start();
    game.submit('Platypus');
    time.advance(ROUND_TIME_MS * 10);
    expect(game.getState().status).toBe('revealing');
    expect(time.pending()).toBe(0);
    const before = time.nowMs();
    game.next();
    // The next round's full time starts when the player moves on.
    expect(game.getState().roundEndsAt).toBe(before + ROUND_TIME_MS);
    expect(story().slice(-2)).toEqual(['revealFinished 0', 'roundStarted 1']);
  });

  it('ignores next() unless a reveal is up', () => {
    const { game } = setup();
    game.next();
    expect(game.getState().status).toBe('idle');
    game.start();
    game.next();
    expect(game.getState()).toMatchObject({ status: 'playing', results: [] });
    game.submit('Platypus');
    game.next();
    game.next(); // a double tap must not skip round 2
    expect(game.getState()).toMatchObject({ status: 'playing' });
    expect(game.getState().results).toHaveLength(1);
  });

  it('ignores a second start', () => {
    const { game, story } = setup();
    game.start();
    game.start();
    expect(story().filter((e) => e === 'runStarted')).toHaveLength(1);
  });
});

describe('gameController: restore', () => {
  function savedAfterOneRound(status: 'playing' | 'revealing'): RunState {
    const first = setup();
    first.game.start();
    first.game.submit('Platypus');
    if (status === 'playing') first.game.next();
    return first.game.getState();
  }

  // Every setup() clock starts at the same instant, so moving the new one on
  // stands in for the time spent reloading.
  function reloadAt(saved: RunState, elapsedMs: number) {
    const next = setup();
    next.time.advance(elapsedMs);
    expect(next.game.restore(saved)).toBe(true);
    return next;
  }

  it('resumes a round with only the time it had left', () => {
    const saved = savedAfterOneRound('playing'); // round 2 began at once
    const deadline = ROUND_TIME_MS;
    expect(saved.roundEndsAt).toBe(createFakeTime().nowMs() + deadline);

    const { game, story, time, log } = reloadAt(saved, 10_600);
    expect(story()).toEqual(['runRestored', 'roundStarted 1']);
    expect(log.find(([name]) => name === 'roundStarted')?.[1]).toMatchObject({
      endsAt: saved.roundEndsAt,
    });
    time.advance(deadline - 10_600 - 1);
    expect(game.getState().results).toHaveLength(1);
    time.advance(1);
    expect(game.getState().results[1]?.match.tier).toBe(0);
  });

  it('never adds time however often the page is reloaded', () => {
    let saved = savedAfterOneRound('playing');
    const deadline = saved.roundEndsAt;
    for (const elapsed of [5_000, 10_000, 20_000]) {
      const { game } = reloadAt(saved, elapsed);
      saved = game.getState();
      expect(saved.roundEndsAt).toBe(deadline);
    }
  });

  it('records a timeout at once if the deadline passed while away', () => {
    const saved = savedAfterOneRound('playing');
    const { game, story } = reloadAt(saved, 60_000);
    expect(story()).toEqual(['runRestored', 'answerMatched 1 tier 0']);
    expect(game.getState().results[1]).toMatchObject({
      promptId: 'r2',
      timeMs: ROUND_TIME_MS,
      match: { tier: 0, input: '' },
    });
  });

  it('treats an answer after the deadline as time up with that text, even if the timer is late', () => {
    const { time, game } = setup();
    game.start();
    // A background tab can hold timers back while the clock keeps going.
    time.skip(ROUND_TIME_MS + 5_000);
    game.submit('Platypus');
    // It was in the box when time ran out, so it counts, with the full round's time.
    expect(game.getState().results[0]).toMatchObject({
      timeMs: ROUND_TIME_MS,
      match: { tier: 2, animalId: 'platypus' },
    });
    expect(time.pending()).toBe(0); // round timer cleared; the reveal waits for next()
  });

  it('puts an interrupted reveal back up, waiting for the player', () => {
    const saved = savedAfterOneRound('revealing');
    const { game, story, time } = setup();
    game.restore(saved);
    time.advance(ROUND_TIME_MS * 10);
    expect(story()).toEqual(['runRestored']);
    expect(time.pending()).toBe(0);
    game.next();
    expect(story()).toEqual(['runRestored', 'revealFinished 0', 'roundStarted 1']);
  });

  it('re-announces a finished run', () => {
    const first = setup();
    first.game.start();
    for (let i = 0; i < 3; i++) {
      first.time.advance(ROUND_TIME_MS);
      first.game.next();
    }
    const { game, story } = setup();
    game.restore(first.game.getState());
    expect(story()).toEqual(['runRestored', 'runFinished 0']);
  });

  it('refuses a run of another puzzle, or once started', () => {
    const saved = savedAfterOneRound('playing');
    const other = setup();
    expect(other.game.restore({ ...saved, puzzleDate: '2026-11-08' })).toBe(false);
    other.game.start();
    expect(other.game.restore(saved)).toBe(false);
    expect(other.game.getState().results).toHaveLength(0);
  });

  // Returning true here would make main.ts skip the start screen and leave the
  // page with nothing on it.
  it('refuses an idle save, so the caller shows the start screen', () => {
    const { game, story } = setup();
    expect(game.restore(setup().game.getState())).toBe(false);
    expect(story()).toEqual([]);
    game.start();
    expect(game.getState().status).toBe('playing');
  });
});

describe('gameController: dispose', () => {
  it('stops timers and ignores later calls', () => {
    const { time, game, story } = setup();
    game.start();
    game.dispose();
    expect(time.pending()).toBe(0);
    time.advance(ROUND_TIME_MS * 3);
    game.submit('Platypus');
    expect(game.getState().results).toHaveLength(0);
    expect(story()).toEqual(['runStarted', 'roundStarted 0']);
  });
});

describe('gameController: mode', () => {
  it('carries the mode into state and runStarted', () => {
    const { game, log } = setup();
    game.start();
    expect(game.getState().mode).toBe('daily');
    expect(log.find(([name]) => name === 'runStarted')?.[1]).toEqual({
      mode: 'daily',
      puzzleDate: '2026-11-07',
      promptCount: 3,
    });
  });
});

describe('gameController: misbehaving listeners', () => {
  function bare(onError?: (error: unknown) => void) {
    const time = createFakeTime();
    const bus = createBus<GameEvents>(onError ? { onError } : {});
    const game = createGameController({
      puzzle,
      animals: ANIMALS,
      bus,
      clock: time.clock,
      scheduler: time.scheduler,
    });
    const seen: string[] = [];
    for (const name of ['roundStarted', 'revealFinished', 'biomeEntered', 'runFinished'] as const) {
      bus.on(name, () => seen.push(name));
    }
    return { time, bus, game, seen };
  }

  it('keeps playing when a listener throws mid-transition', () => {
    const errors: unknown[] = [];
    const { time, bus, game, seen } = bare((error) => errors.push(error));
    bus.on('revealFinished', () => {
      throw new Error('scene broke');
    });
    game.start();
    game.submit('Platypus');
    game.next();
    expect(errors).toHaveLength(1);
    // The next round still began, with its timer running.
    expect(seen).toEqual(['roundStarted', 'revealFinished', 'roundStarted']);
    expect(game.getState().status).toBe('playing');
    expect(time.pending()).toBe(1);
  });

  it.each(['answerMatched', 'revealFinished'] as const)(
    'stops fully when a listener disposes it during %s',
    (event) => {
      const { time, bus, game, seen } = bare();
      bus.on(event, () => game.dispose());
      game.start();
      game.submit('Platypus');
      expect(time.pending()).toBe(0);
      game.next(); // ignored if already disposed
      // Disposed during revealFinished: no round timer may have been started.
      expect(time.pending()).toBe(0);
      time.advance(ROUND_TIME_MS * 3);
      expect(game.getState().results).toHaveLength(1);
      // Nothing is announced after dispose.
      expect(seen).toEqual(
        event === 'answerMatched' ? ['roundStarted'] : ['roundStarted', 'revealFinished'],
      );
    },
  );

  it('stops fully when a listener disposes it during biomeEntered', () => {
    const { time, bus, game, seen } = bare();
    bus.on('biomeEntered', () => game.dispose());
    game.start();
    game.submit('snow leopard'); // 50 points: enters Grassland
    game.next();
    time.advance(ROUND_TIME_MS * 3);
    expect(seen).toEqual(['roundStarted', 'revealFinished', 'biomeEntered']);
    expect(time.pending()).toBe(0);
  });
});

describe('gameController: retrying a guess', () => {
  it('rejects a guess that matches nothing, and the round goes on', () => {
    const { time, game, story, log } = setup();
    game.start();
    const changes = log.length;
    game.submit('James');
    expect(story().at(-1)).toBe('answerRejected James');
    expect(game.getState()).toMatchObject({ status: 'playing', results: [] });
    expect(log.slice(changes).some(([name]) => name === 'stateChanged')).toBe(false);
    expect(time.pending()).toBe(1); // the round timer still runs
    game.submit('tiger');
    expect(game.getState().results[0]?.match).toMatchObject({ animalId: 'tiger', tier: 4 });
  });

  it('never scores nonsense, however often the player retries', () => {
    const { game } = setup();
    game.start();
    for (let i = 0; i < 200; i++) game.submit(`nonsense ${i}`);
    expect(game.getState().results).toHaveLength(0);
  });

  it('submits what is in the box when time runs out: scored if it matches', () => {
    const { time, game } = setup();
    game.start();
    game.setDraft('platypus');
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results[0]).toMatchObject({
      timeMs: ROUND_TIME_MS,
      match: { tier: 2, animalId: 'platypus', input: 'platypus' },
    });
  });

  it('scores 0 if the box still matches nothing, keeping what was typed', () => {
    const { time, game } = setup();
    game.start();
    game.submit('James');
    game.setDraft('James');
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results[0]?.match).toEqual({
      tier: 0,
      animalId: null,
      strategy: null,
      input: 'James',
    });
  });

  it.each([
    ['platipus', 'Platypus'],
    ['orca', 'Killer whale'],
    ['plat', 'Platypus'],
  ])('offers the exact name for a close guess %j, scoring nothing yet', (typed, name) => {
    const { time, game, story } = setup();
    game.start();
    game.submit(typed);
    expect(story().at(-1)).toBe(`answerSuggested ${typed} -> ${name}`);
    expect(game.getState()).toMatchObject({ status: 'playing', results: [] });
    expect(time.pending()).toBe(1);
    game.submit(name);
    expect(game.getState().results[0]?.match.strategy).toBe('exact');
  });

  it('scores only an exact name at time-up; a close guess counts as a miss', () => {
    const { time, game } = setup();
    game.start();
    game.setDraft('platipus');
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results[0]?.match).toEqual({
      tier: 0,
      animalId: null,
      strategy: null,
      input: 'platipus',
    });
  });

  it('forgets the draft at the next prompt', () => {
    const { time, game } = setup();
    game.start();
    game.setDraft('platypus');
    game.submit('platypus');
    game.next();
    time.advance(ROUND_TIME_MS);
    expect(game.getState().results[1]?.match).toMatchObject({ tier: 0, input: '' });
  });
});
