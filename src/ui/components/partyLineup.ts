import type { Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { Component } from './component';
import { portrait } from './portrait';
import type { TeamRound } from './teamCard';

/** Screen pixels per sprite pixel in the line-up. */
const SCALE = 2;

/**
 * The party as it ends the journey: the traveller in front (on the right,
 * facing the way they walked) and the animals that joined behind, first
 * joined nearest, on a strip of ground.
 */
export function partyLineup(rounds: readonly TeamRound[], portraits?: Portraits): Component {
  const members = rounds.filter((r) => r.animal !== null);
  const el = h(
    'div',
    {
      class: 'party',
      role: 'img',
      'aria-label':
        members.length === 0
          ? 'You travelled alone'
          : `You and ${members.map((r) => r.animal!.display).join(', ')}`,
    },
    ...[...members]
      .reverse()
      .map((r) => portrait(r.animal, r.result.match.tier === 5, { scale: SCALE, portraits })),
    portrait(null, false, { scale: SCALE, portraits }),
  );
  return { el, destroy: () => {} };
}
