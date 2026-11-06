import type { TierId } from '@/core/types';

/** Keys into the scene's effect registry (Step 9). */
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
    emoji: '🟩',
    points: 1,
    effectId: 'none',
  },
  {
    id: 2,
    name: 'Near Threatened',
    shortName: 'NT',
    colour: '--tier-2',
    emoji: '🟦',
    points: 2,
    effectId: 'glint',
  },
  {
    id: 3,
    name: 'Vulnerable',
    shortName: 'VU',
    colour: '--tier-3',
    emoji: '🟪',
    points: 3,
    effectId: 'glint',
  },
  {
    id: 4,
    name: 'Endangered',
    shortName: 'EN',
    colour: '--tier-4',
    emoji: '🟧',
    points: 5,
    effectId: 'sparkle',
  },
  {
    id: 5,
    name: 'Critically Endangered',
    shortName: 'CR',
    colour: '--tier-5',
    emoji: '🟥',
    points: 8,
    effectId: 'shiny',
  },
] as const satisfies readonly TierDef[];
