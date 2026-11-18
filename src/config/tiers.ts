// Answer levels (v2). Every answer on every prompt has a hand-set level 1-5;
// points are fixed per level. The labels borrow the IUCN Red List's names for
// flavour only: an answer's level is not the animal's real conservation status.

/** 0 = no match (a miss or time-up); 1-5 are answer levels, rarer is higher. */
export type LevelId = 0 | 1 | 2 | 3 | 4 | 5;

/** Levels a real answer can have (0 is only ever a miss). */
export type AnswerLevel = Exclude<LevelId, 0>;

/** The highest level: exactly one per prompt, unless the day's theme allows more. */
export const TOP_LEVEL = 5 satisfies AnswerLevel;

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
