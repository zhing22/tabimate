// Answer levels (v2). Every answer on every prompt has a hand-set level 1-5;
// points are fixed per level. The labels borrow the IUCN Red List's names for
// flavour only: an answer's level is not the animal's real conservation status.

/** 0 = no match (a miss or time-up); 1-5 are answer levels, rarer is higher. */
export type LevelId = 0 | 1 | 2 | 3 | 4 | 5;

/** Levels a real answer can have (0 is only ever a miss). */
export type AnswerLevel = Exclude<LevelId, 0>;

/** Keys into the scene's effect registry, which must cover every id. */
export type EffectId = 'none' | 'glint' | 'sparkle' | 'shiny';

/** Keys into services/sounds.ts: the sound a level's reveal plays. */
export type LevelSoundId = `level${LevelId}`;

export interface LevelDef {
  readonly id: LevelId;
  readonly name: string;
  /** Badge code: LC NT VU EN CR. */
  readonly shortName: string;
  /** CSS custom property defined in ui/styles/tokens.css. */
  readonly colour: `--tier-${LevelId}`;
  /** Square emoji used in share text. */
  readonly emoji: string;
  /** Fixed per level; read through core/scoring.ts, not from here. */
  readonly points: number;
  readonly effectId: EffectId;
  readonly soundId: LevelSoundId;
}

/** Indexed by LevelId: LEVELS[level] is that level's definition. */
export const LEVELS = [
  {
    id: 0,
    name: 'No match',
    shortName: '—',
    colour: '--tier-0',
    emoji: '⬛',
    points: 0,
    effectId: 'none',
    soundId: 'level0',
  },
  {
    id: 1,
    name: 'Least Concern',
    shortName: 'LC',
    colour: '--tier-1',
    emoji: '⬜',
    points: 10,
    effectId: 'none',
    soundId: 'level1',
  },
  {
    id: 2,
    name: 'Near Threatened',
    shortName: 'NT',
    colour: '--tier-2',
    emoji: '🟦',
    points: 25,
    effectId: 'glint',
    soundId: 'level2',
  },
  {
    id: 3,
    name: 'Vulnerable',
    shortName: 'VU',
    colour: '--tier-3',
    emoji: '🟥',
    points: 50,
    effectId: 'glint',
    soundId: 'level3',
  },
  {
    id: 4,
    name: 'Endangered',
    shortName: 'EN',
    colour: '--tier-4',
    emoji: '🟪',
    points: 85,
    effectId: 'sparkle',
    soundId: 'level4',
  },
  {
    id: 5,
    name: 'Critically Endangered',
    shortName: 'CR',
    colour: '--tier-5',
    emoji: '🟨',
    points: 100,
    effectId: 'shiny',
    soundId: 'level5',
  },
] as const satisfies readonly LevelDef[];

// Everything below is derived from LEVELS, so the range is written down once.

/** Levels a real answer can have, lowest first. */
export const ANSWER_LEVELS: readonly AnswerLevel[] = LEVELS.map((l) => l.id).filter(
  (id): id is AnswerLevel => id !== 0,
);

/** The highest level: exactly one answer per prompt has it. */
export const TOP_LEVEL: AnswerLevel = ANSWER_LEVELS[ANSWER_LEVELS.length - 1]!;

/** True for any level id, including 0 (a miss). For reading untrusted data. */
export const isLevelId = (value: unknown): value is LevelId => LEVELS.some((l) => l.id === value);

/** Whether a level draws its animal shiny. Decided by LEVELS[].effectId, not the number. */
export const isShiny = (level: LevelId): boolean => LEVELS[level].effectId === 'shiny';
