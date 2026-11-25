import { isShiny } from '@/config/levels';
import { BACKDROP_GROUND_Y, BACKDROP_HEIGHT } from '@/config/render';
import { RESULTS_RIGHT_GROUP_FACING, UI_SPRITE_SCALE } from '@/config/ui';
import { biomeFor } from '@/core/journey';
import { lineupSides } from '@/core/lineup';
import type { BackdropImage, Backdrops, Portraits } from '@/core/portrait';
import { h } from '../dom';
import type { Component } from './component';
import { portrait, type PortraitOptions } from './portrait';
import type { TeamRound } from './teamCard';

const SCALE = UI_SPRITE_SCALE.lineup;
/** Without a painted backdrop: the same crop of the scene, so nothing jumps when one arrives. */
const FALLBACK = { height: BACKDROP_HEIGHT, groundY: BACKDROP_GROUND_Y };

export interface PartyLineupOptions {
  readonly portraits?: Portraits | undefined;
  readonly backdrops?: Backdrops | undefined;
  /**
   * The run's final score: the frame takes the colours of the biome it reached,
   * then the backdrop of the scenery where the walk ended.
   */
  readonly score?: number | undefined;
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
 * Scales the party down (never up) to the frame's width, so the whole team
 * always shows; from its feet, so everyone stays on the walk line.
 */
function fitToWidth(frame: HTMLElement, row: HTMLElement): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {};
  const fit = () => {
    const natural = row.offsetWidth;
    const scale = natural > 0 ? Math.min(1, frame.clientWidth / natural) : 1;
    row.style.transform = scale < 1 ? `scale(${scale})` : '';
  };
  const observer = new ResizeObserver(fit);
  observer.observe(frame);
  observer.observe(row); // a sprite replacing an emoji changes its width
  return () => observer.disconnect();
}

/** One side of the traveller: its animals left to right, each in a slot that can face either way. */
function side(rounds: readonly TeamRound[], facing: 'left' | 'right', sprite: PortraitOptions) {
  return h(
    'div',
    { class: `party__side party__side--face-${facing}` },
    ...rounds
      .filter((r) => r.animal !== null)
      .map((r) =>
        h(
          'span',
          { class: 'party__slot' },
          portrait(r.animal, isShiny(r.result.match.level), sprite),
        ),
      ),
  );
}

/**
 * The party as it ends the journey, standing in the biome reached, all in a
 * framed snapshot of the scenery: the traveller in the middle, the later
 * prompts' animals on the left facing them, the earlier ones on the right
 * (core/lineup.ts; facing RESULTS_RIGHT_GROUP_FACING). The whole team always
 * fits the frame's width. The biome's colours show until the scenery is ready.
 */
export function partyLineup(
  rounds: readonly TeamRound[],
  opts: PartyLineupOptions = {},
): Component {
  const members = rounds.filter((r) => r.animal !== null);
  const sprite = { scale: SCALE, portraits: opts.portraits, walking: true };
  const { left, right } = lineupSides(rounds);
  const row = h(
    'div',
    { class: 'party__members' },
    side(left, 'right', sprite),
    h('span', { class: 'party__slot party__traveller' }, portrait(null, false, sprite)),
    side(right, RESULTS_RIGHT_GROUP_FACING, sprite),
  );
  // Each one bobs a little out of step with the next, like the scene's party.
  row
    .querySelectorAll<HTMLElement>('.portrait')
    .forEach((child, i) => child.style.setProperty('--i', String(i)));

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
  if (opts.score !== undefined) {
    const biome = biomeFor(opts.score);
    el.style.setProperty('--party-sky-top', biome.palette.skyTop);
    el.style.setProperty('--party-sky-bottom', biome.palette.skyBottom);
    el.style.setProperty('--party-ground', biome.palette.ground);
  }
  fit(el, FALLBACK);
  if (opts.score !== undefined && opts.backdrops) {
    void opts.backdrops(opts.score).then((image) => {
      if (image) showBackdrop(el, image);
    });
  }
  return { el, destroy: fitToWidth(el, row) };
}
