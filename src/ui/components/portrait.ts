import type { PortraitImage, Portraits } from '@/core/portrait';
import type { Animal } from '@/core/types';
import { h } from '../dom';

/** The traveller, until a sprite says otherwise. */
const PLAYER_EMOJI = '🧑';

export interface PortraitOptions {
  /** Screen pixels per sprite pixel: a whole number keeps the art crisp. */
  readonly scale: number;
  readonly portraits?: Portraits | undefined;
  /** Play the sprite's walk cycle in place, if it has one (the results line-up). */
  readonly walking?: boolean;
}

/**
 * A character's picture: its emoji at once, swapped for the scene's pixel
 * sprite when that is available (sprites may still be loading on a reload).
 * `animal` null is the player. Decorative: names are always shown as text.
 */
export function portrait(
  animal: Animal | null,
  shiny: boolean,
  opts: PortraitOptions,
): HTMLElement {
  const el = h(
    'span',
    { class: 'portrait', 'aria-hidden': 'true' },
    animal ? animal.emoji : PLAYER_EMOJI,
  );
  void opts.portraits?.(animal, shiny).then((image) => {
    if (!image) return;
    if (opts.walking && image.walk) {
      el.replaceChildren(walkingSprite(image, image.walk, opts.scale));
      el.classList.add('portrait--sprite');
      return;
    }
    const img = h('img', {
      class: 'portrait__sprite',
      src: image.src,
      alt: '',
      width: image.width * opts.scale,
      height: image.height * opts.scale,
    });
    if (image.facesLeft) img.classList.add('portrait__sprite--flip');
    el.replaceChildren(img);
    el.classList.add('portrait--sprite');
  });
  return el;
}

/**
 * The walk cycle as a stepped background animation over the frames strip:
 * CSS plays it (ui/styles/results.css), so no script runs per frame, and
 * reduced motion simply stops it on the first frame.
 */
function walkingSprite(
  image: PortraitImage,
  walk: NonNullable<PortraitImage['walk']>,
  scale: number,
): HTMLElement {
  const width = image.width * scale;
  const height = image.height * scale;
  const el = h('span', {
    class: image.facesLeft ? 'portrait__walk portrait__sprite--flip' : 'portrait__walk',
  });
  el.style.width = `${width}px`;
  el.style.height = `${height}px`;
  el.style.backgroundImage = `url("${walk.src}")`;
  el.style.backgroundSize = `${width * walk.frames}px ${height}px`;
  el.style.setProperty('--walk-to', `-${width * walk.frames}px`);
  el.style.setProperty('--walk-steps', String(walk.frames));
  el.style.setProperty('--walk-s', `${walk.frames / walk.fps}s`);
  return el;
}
