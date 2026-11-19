// Every sound in the game, synthesised: a few oscillator notes each, so there
// are no audio files to load. Data only; services/audio.ts plays them.

import { LEVELS, type LevelId, type LevelSoundId } from '@/config/levels';

export interface Note {
  /** Hz. */
  readonly freq: number;
  /** Seconds after the sound starts. */
  readonly at: number;
  /** Seconds. */
  readonly dur: number;
  readonly wave: OscillatorType;
  /** Peak volume, 0..1, before the master volume. */
  readonly gain: number;
  /** Slide to this frequency over the note (a sweep), if set. */
  readonly to?: number;
}

/** Each level's reveal sound (config LEVELS[].soundId), plus the game's other sounds. */
export type SoundName = LevelSoundId | 'join' | 'jackpot' | 'miss' | 'hint' | 'tick';

// Notes of a major scale around C5, for arpeggios that rise with the level.
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const E6 = 1318.5;
const G6 = 1568;
const C7 = 2093;

const note = (
  freq: number,
  at: number,
  dur: number,
  gain = 0.25,
  wave: OscillatorType = 'square',
): Note => ({
  freq,
  at,
  dur,
  wave,
  gain,
});

/** A quick rising run of high, quiet triangle notes: the sound of a sparkle. */
const shimmer = (start: number, count: number): Note[] =>
  Array.from({ length: count }, (_, i) =>
    note(G6 * 2 ** (i / 12), start + i * 0.035, 0.08, 0.08, 'triangle'),
  );

/**
 * Each level sounds clearly different, and grander as it gets rarer: level 0 a
 * flat "time's up" buzz, then one note, two, a three-note arpeggio, a four-note
 * arpeggio with a sparkle, and for level 5 a fanfare with a long shimmer.
 */
export const SOUNDS: Readonly<Record<SoundName, readonly Note[]>> = {
  level0: [note(220, 0, 0.18, 0.2, 'sawtooth'), note(165, 0.16, 0.3, 0.2, 'sawtooth')],
  level1: [note(C5, 0, 0.18)],
  level2: [note(C5, 0, 0.1), note(G5, 0.09, 0.22)],
  level3: [note(C5, 0, 0.09), note(E5, 0.08, 0.09), note(G5, 0.16, 0.28)],
  level4: [
    note(C5, 0, 0.08),
    note(E5, 0.07, 0.08),
    note(G5, 0.14, 0.08),
    note(C6, 0.21, 0.32),
    ...shimmer(0.3, 5),
  ],
  level5: [
    note(C5, 0, 0.08),
    note(E5, 0.07, 0.08),
    note(G5, 0.14, 0.08),
    note(C6, 0.21, 0.1),
    note(E6, 0.29, 0.1),
    note(G6, 0.37, 0.45, 0.22),
    note(C7, 0.37, 0.45, 0.1, 'triangle'),
    ...shimmer(0.45, 10),
  ],
  // A top-level find, after its freeze: a bright run up to a held chord, and a
  // long shimmer. Unlike anything else, so it is recognisable by ear.
  jackpot: [
    note(G5, 0, 0.06, 0.2),
    note(C6, 0.05, 0.06, 0.2),
    note(E6, 0.1, 0.06, 0.2),
    note(G6, 0.15, 0.06, 0.2),
    note(C7, 0.2, 0.6, 0.18, 'triangle'),
    note(G6, 0.2, 0.6, 0.12),
    note(E6, 0.2, 0.6, 0.1),
    ...shimmer(0.25, 16),
  ],
  // A follower joins the party: a soft upward pop.
  join: [{ freq: 300, to: 700, at: 0, dur: 0.09, wave: 'triangle', gain: 0.2 }],
  // A guess that isn't on the list: a short low "nope".
  miss: [note(140, 0, 0.09, 0.18, 'square'), note(110, 0.08, 0.12, 0.18, 'square')],
  // A guess corrected to an answer: a questioning two-note rise.
  hint: [note(E5, 0, 0.07, 0.15, 'triangle'), note(G5, 0.07, 0.1, 0.15, 'triangle')],
  // The last seconds of a round.
  tick: [note(1200, 0, 0.03, 0.1, 'square')],
};

/** The sound a level's reveal plays: its soundId in config/levels.ts. */
export const levelSound = (level: LevelId): SoundName => LEVELS[level].soundId;
