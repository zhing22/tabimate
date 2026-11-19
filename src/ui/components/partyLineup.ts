import { BIOMES } from '@/config/biomes';
import { isShiny } from '@/config/levels';
import { BACKDROP_GROUND_Y, BACKDROP_HEIGHT } from '@/config/render';
import type { BackdropImage, Backdrops, Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { Component } from './component';
import { portrait } from './portrait';
import type { TeamRound } from './teamCard';

/** Screen pixels per sprite pixel in the line-up (and its backdrop). */
const SCALE = 2;
/** Without a painted backdrop: the same crop of the scene, so nothing jumps when one arrives. */
const FALLBACK = { height: BACKDROP_HEIGHT, groundY: BACKDROP_GROUND_Y };

export interface PartyLineupOptions {
  readonly portraits?: Portraits | undefined;
  readonly backdrops?: Backdrops | undefined;
  /** The biome reached: its scenery fills the frame. */
  readonly biomeId?: string | undefined;
}

/** Sizes the frame so the party's feet rest on the backdrop's walk line. */
function fit(frame: HTMLElement, { height, groundY }: { height: number; groundY: number }) {
  frame.style.height = `${height * SCALE}px`;
  frame.style.paddingBottom = `${(height - groundY) * SCALE}px`;
}

function showBackdrop(frame: HTMLElement, image: BackdropImage) {
  fit(frame, image);
  frame.style.backgroundImage = `url("${image.src}")`;
  frame.style.backgroundSize = `${image.width * SCALE}px ${image.height * SCALE}px`;
}

/**
 * The party as it ends the journey, standing in the biome reached: the
 * traveller in front (on the right, facing the way they walked) and the
 * animals that joined behind, first joined nearest, all in a framed snapshot
 * of the scenery. The biome's colours show until the painted scenery is ready.
 */
export function partyLineup(
  rounds: readonly TeamRound[],
  opts: PartyLineupOptions = {},
): Component {
  const members = rounds.filter((r) => r.animal !== null);
  const sprite = { scale: SCALE, portraits: opts.portraits, walking: true };
  const row = h(
    'div',
    { class: 'party__members' },
    ...[...members].reverse().map((r) => portrait(r.animal, isShiny(r.result.match.level), sprite)),
    portrait(null, false, sprite),
  );
  // Each one bobs a little out of step with the next, like the scene's party.
  [...row.children].forEach((child, i) =>
    (child as HTMLElement).style.setProperty('--i', String(i)),
  );

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
    row,
  );
  const biome = BIOMES.find((b) => b.id === opts.biomeId);
  if (biome) {
    el.style.setProperty('--party-sky-top', biome.palette.skyTop);
    el.style.setProperty('--party-sky-bottom', biome.palette.skyBottom);
    el.style.setProperty('--party-ground', biome.palette.ground);
  }
  fit(el, FALLBACK);
  if (opts.biomeId && opts.backdrops) {
    void opts.backdrops(opts.biomeId).then((image) => {
      if (image) showBackdrop(el, image);
    });
  }
  return { el, destroy: () => {} };
}
