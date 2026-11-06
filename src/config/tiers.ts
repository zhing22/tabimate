/** 0 = no match; 1–5 follow IUCN Red List categories, rarer is higher. */
export type TierId = 0 | 1 | 2 | 3 | 4 | 5;

/** Tiers a real answer can have (tier 0 is only ever a miss). */
export type AnswerTierId = Exclude<TierId, 0>;

/** Keys into the scene's tier effect registry, which must cover every id. */
export type EffectId = 'none' | 'glint' | 'sparkle' | 'shiny';

export interface TierDef {
  readonly id: TierId;
  readonly name: string;
  readonly shortName: string;
  /** CSS custom property defined in ui/styles/tokens.css. */
  readonly colour: `--tier-${TierId}`;
  /** Square emoji used in share text. */
  readonly emoji: string;
  readonly points: number;
  readonly effectId: EffectId;
}

/** Indexed by TierId: TIERS[tier] is that tier's definition. */
export const TIERS = [
  {
    id: 0,
    name: 'No match',
    shortName: '—',
    colour: '--tier-0',
    emoji: '⬛',
    points: 0,
    effectId: 'none',
  },
  {
    id: 1,
    name: 'Least Concern',
    shortName: 'LC',
    colour: '--tier-1',
    emoji: '⬜',
    points: 10,
    effectId: 'none',
  },
  {
    id: 2,
    name: 'Near Threatened',
    shortName: 'NT',
    colour: '--tier-2',
    emoji: '🟦',
    points: 25,
    effectId: 'glint',
  },
  {
    id: 3,
    name: 'Vulnerable',
    shortName: 'VU',
    colour: '--tier-3',
    emoji: '🟥',
    points: 50,
    effectId: 'glint',
  },
  {
    id: 4,
    name: 'Endangered',
    shortName: 'EN',
    colour: '--tier-4',
    emoji: '🟪',
    points: 85,
    effectId: 'sparkle',
  },
  {
    id: 5,
    name: 'Critically Endangered',
    shortName: 'CR',
    colour: '--tier-5',
    emoji: '🟨',
    points: 100,
    effectId: 'shiny',
  },
] as const satisfies readonly TierDef[];
